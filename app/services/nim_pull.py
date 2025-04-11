# File: app/services/nim_pull.py
from typing import Dict
from queue import Queue

class NimPullProgress:
    def __init__(self, image_name: str, progress_queues: Dict[str, Queue]):
        self.image_name = image_name
        self.queue = Queue()
        self.total_size = 0
        self.current_size = 0
        progress_queues[image_name] = self.queue

    def __call__(self, current: Dict):
        if 'total' in current:
            self.total_size = current['total']
        if 'current' in current:
            self.current_size = current['current']
        
        self.queue.put({
            'total_size': self.total_size,
            'current_size': self.current_size,
            'status': 'in_progress'
        })
