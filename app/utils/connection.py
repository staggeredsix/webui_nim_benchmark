# /app/utils/connection.py
from typing import Set
from fastapi import WebSocket
import asyncio
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._cleanup_task = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"Client connected. Total connections: {len(self.active_connections)}")

    async def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
        logger.info(f"Client disconnected. Remaining connections: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Error broadcasting to client: {e}")
                disconnected.add(connection)
        
        for connection in disconnected:
            await self.disconnect(connection)

    async def cleanup_stale_connections(self):
        while True:
            stale = set()
            for connection in self.active_connections:
                if connection.client_state.DISCONNECTED:
                    stale.add(connection)
            
            for connection in stale:
                await self.disconnect(connection)
            
            await asyncio.sleep(30)

connection_manager = ConnectionManager()