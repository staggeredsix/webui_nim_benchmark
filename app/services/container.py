# app/services/container.py
import os
import asyncio
import json
import docker
import aiohttp
from datetime import datetime
from docker.errors import APIError
from typing import Dict, List, Optional, Any
from ..config import settings
from ..utils.logger import logger
from ..utils.ngc_key_helper import retrieve_key

class ContainerManager:
    def __init__(self):
        self.client = docker.from_env()
        self._active_nim = None

    def parse_model_info(self, image_name: str) -> Dict[str, str]:
        """Extract model and developer information from the image name."""
        try:
            parts = image_name.split('/')
            model_name = parts[-1].split(':')[0]
            developer_name = parts[-2]
            return {
                'model_name': model_name,
                'developer': developer_name,
                'full_name': f"{developer_name}/{model_name}"
            }
        except Exception as e:
            logger.error(f"Error parsing model info from {image_name}: {e}")
            return {
                'model_name': 'unknown',
                'developer': 'unknown',
                'full_name': 'unknown/unknown'
            }

    async def wait_for_container_ready(self, container, model_info: Dict[str, str], timeout: int = 1200) -> str:
        """Wait for the NIM container to be fully initialized by monitoring logs and sending a test request."""
        start_time = datetime.now()
        readiness_marker = "Uvicorn running on http://0.0.0.0:8000"
        log_stream = container.logs(stream=True, follow=True)
        server_started = False

        try:
            # Monitor logs for readiness marker
            for log_line in log_stream:
                log_line = log_line.decode("utf-8").strip()
                logger.info(f"Container Log: {log_line}")

                if readiness_marker in log_line:
                    logger.info(f"Container {container.id} server started, sending test request to verify readiness...")
                    server_started = True
                    break

                if any(err in log_line.lower() for err in ["error:", "exception:", "failed"]):
                    logger.error(f"Error in container logs: {log_line}")
                    return "error"

                elapsed_time = (datetime.now() - start_time).seconds
                if elapsed_time > timeout:
                    logger.error(f"Timeout waiting for server to start after {elapsed_time} seconds")
                    return "timeout"

            if not server_started:
                return "error"

            # Send a test request to verify the model is alive
            port = 8000
            max_retries = 5
            retry_delay = 10
            for attempt in range(max_retries):
                try:
                    async with aiohttp.ClientSession() as session:
                        payload = {
                            "model": model_info['full_name'],
                            "messages": [{"role": "user", "content": "Are you alive?"}],
                            "max_tokens": 64
                        }
                        headers = {
                            "accept": "application/json",
                            "Content-Type": "application/json"
                        }
                        async with session.post(f"http://localhost:{port}/v1/chat/completions", json=payload, headers=headers) as resp:
                            if resp.status == 200:
                                response_data = await resp.json()
                                logger.info(f"Container {container.id} responded successfully: {response_data}")
                                return "ready"
                            else:
                                logger.error(f"Unexpected response status: {resp.status}")
                except Exception as e:
                    logger.warning(f"Attempt {attempt + 1}/{max_retries}: Error sending test request to container: {e}")
                await asyncio.sleep(retry_delay)

            logger.error(f"Container did not respond after {max_retries} attempts")
            return "timeout"

        except Exception as e:
            logger.error(f"Error monitoring container startup: {e}")
            return "error"

    def list_containers(self) -> List[Dict[str, Any]]:
        """List all NIM-related containers and images."""
        try:
            all_containers = self.client.containers.list(all=True)
            all_images = self.client.images.list()
            
            nim_containers = []
            seen_images = set()
            
            for container in all_containers:
                image_name = container.image.tags[0] if container.image.tags else container.image.id
                
                is_nim = (
                    container.labels.get("com.nvidia.nim") == "true" or
                    any("nim" in tag.lower() for tag in container.image.tags) if container.image.tags else False
                )
                
                if is_nim:
                    seen_images.add(image_name)
                    container_info = {
                        "container_id": container.id,
                        "image_name": image_name,
                        "port": 8000,  # Hardcoding port to 8000
                        "status": "running" if container.status == "running" else "stopped",
                        "is_container": True,
                        "health": self._check_container_health(container),
                        "labels": container.labels,
                        "tags": container.image.tags
                    }
                    logger.debug(f"Found NIM container: {container_info}")
                    nim_containers.append(container_info)
            
            for image in all_images:
                for tag in image.tags:
                    if "nim" in tag.lower() and tag not in seen_images:
                        image_info = {
                            "container_id": None,
                            "image_name": tag,
                            "port": None,
                            "status": "not_running",
                            "is_container": False,
                            "health": {"healthy": False, "status": "no_container", "checks": []},
                            "labels": image.labels,
                            "tags": [tag]
                        }
                        logger.debug(f"Found NIM image: {image_info}")
                        nim_containers.append(image_info)
                        seen_images.add(tag)

            return sorted(nim_containers, key=lambda x: (
                0 if x.get("status") == "running" else
                1 if x.get("status") == "stopped" else
                2
            ))

        except Exception as e:
            logger.error(f"Error listing containers: {e}")
            return []

    def _check_container_health(self, container) -> Dict[str, Any]:
        """Check the health of a container based on Docker's health status."""
        try:
            if container.status != "running":
                return {"healthy": False, "status": "not_running", "checks": []}

            health = container.attrs.get('State', {}).get('Health', {})
            status = health.get('Status', 'unknown')

            return {
                "healthy": status == "healthy",
                "status": status,
                "checks": health.get('Log', [])
            }
        except Exception as e:
            logger.error(f"Error checking container health: {e}")
            return {"healthy": False, "status": "unknown", "checks": []}

    def _get_container_port(self, container) -> Optional[int]:
        """Retrieve the mapped port for the container."""
        try:
            if container.status != "running":
                return None
                
            return 8000  # Hardcoded port to 8000
        except Exception as e:
            logger.error(f"Error getting container port mapping: {e}")
            return None

    async def start_container(self, image_name: str, gpu_count: int = 1) -> Optional[Dict[str, Any]]:
        """Start a NIM container with GPU support."""
        try:
            ngc_key = retrieve_key()
            if not ngc_key:
                raise RuntimeError("NGC API key not found. Please add it through the WebUI.")
            
            if ngc_key not in os.environ.get("NGC_API_KEY", ""):
                os.environ["NGC_API_KEY"] = ngc_key

            local_nim_cache = os.path.expanduser("~/.cache/nim")
            os.makedirs(local_nim_cache, exist_ok=True)

            model_info = self.parse_model_info(image_name)
            
            container = self.client.containers.run(
                image_name,
                detach=True,
                remove=True,
                environment={
                    "NGC_API_KEY": ngc_key,
                },
                labels={"com.nvidia.nim": "true"},
                ports={'8000/tcp': 8000},  # Bind container port 8000 to host port 8000
                device_requests=[
                    docker.types.DeviceRequest(count=gpu_count, capabilities=[["gpu"]])
                ],
                volumes={
                    local_nim_cache: {
                        'bind': '/opt/nim/.cache',
                        'mode': 'rw'
                    }
                },
                user=f"{os.getuid()}:{os.getgid()}",
                shm_size='16G'
            )

            logger.info(f"Container created, waiting for initialization...")
            
            # Wait for container readiness
            container_status = await self.wait_for_container_ready(container, model_info)
            
            container_info = {
                "container_id": container.id,
                "image_name": image_name,
                "port": 8000,  # Hardcoded port to 8000
                "status": container_status,
                "is_container": True,
                "health": self._check_container_health(container),
                "model_info": model_info
            }

            # Only set active NIM if container is ready
            if container_status == "ready":
                self._active_nim = container_info
                self.save_nim(container_info)
                logger.info(f"Started NIM container: {container_info}")
                return container_info
            else:
                raise RuntimeError(f"Container failed to start properly: {container_status}")

        except Exception as e:
            logger.error(f"Failed to start container: {e}")
            raise

    async def stop_container(self, container_id: str):
        """Stop and remove a container."""
        try:
            container = self.client.containers.get(container_id)
            container.stop(timeout=2)
            container.remove(force=True)
            logger.info(f"Stopped and removed container: {container_id}")
            if self._active_nim and self._active_nim['container_id'] == container_id:
                self._active_nim = None
        except APIError as e:
            if "removal of container" in str(e) and "is already in progress" in str(e):
                logger.info(f"Container {container_id} already being removed")
            else:
                raise

    def save_nim(self, nim_info: Dict):
        """Save NIM information to a file."""
        try:
            with open(settings.NIM_FILE, "w") as f:
                json.dump(nim_info, f)
        except Exception as e:
            logger.error(f"Error saving NIM file: {e}")

    def load_nim(self) -> Optional[Dict]:
        """Load NIM information from file."""
        try:
            if not os.path.exists(settings.NIM_FILE):
                logger.warning(f"NIM file not found: {settings.NIM_FILE}")
                return None

            with open(settings.NIM_FILE, "r") as f:
                data = f.read().strip()
                if not data:
                    return None
                loaded_data = json.loads(data)
                logger.info(f"Loaded NIM data: {loaded_data}")
                return loaded_data

        except Exception as e:
            logger.error(f"Error loading NIM file: {e}")
            return None

# Create singleton instance
container_manager = ContainerManager()

# Export the instance
__all__ = ['container_manager']
