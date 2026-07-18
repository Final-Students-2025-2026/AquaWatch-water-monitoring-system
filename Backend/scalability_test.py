"""
Scalability Testing Script for AquaWatch
Tests system performance with multiple concurrent devices and data load
"""

import asyncio
import aiohttp
import time
import statistics
from datetime import datetime
import json


class ScalabilityTester:
    def __init__(self, base_url="http://localhost:8000/api", token=None):
        self.base_url = base_url
        self.token = token
        self.results = []
        
    def get_headers(self):
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers
    
    async def test_arduino_post(self, session, device_id, delay=0):
        """Simulate Arduino POST request"""
        await asyncio.sleep(delay)
        
        payload = f"TEMP:27.1,TDS:77,EC:121,NTU:8.4,PH:7.2,ORP:414,TIER:0"
        url = f"{self.base_url}/readings/?device_id={device_id}"
        
        start_time = time.time()
        try:
            async with session.post(url, data=payload, headers={"Content-Type": "text/plain"}) as response:
                end_time = time.time()
                response_time = end_time - start_time
                success = response.status == 201
                
                return {
                    'test': 'arduino_post',
                    'device_id': device_id,
                    'success': success,
                    'status_code': response.status,
                    'response_time': response_time,
                    'timestamp': datetime.now().isoformat()
                }
        except Exception as e:
            end_time = time.time()
            return {
                'test': 'arduino_post',
                'device_id': device_id,
                'success': False,
                'error': str(e),
                'response_time': end_time - start_time,
                'timestamp': datetime.now().isoformat()
            }
    
    async def test_api_endpoint(self, session, endpoint, method='GET'):
        """Test generic API endpoint"""
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()
        
        try:
            async with session.request(method, url, headers=self.get_headers()) as response:
                end_time = time.time()
                response_time = end_time - start_time
                success = response.status < 400
                
                return {
                    'test': 'api_endpoint',
                    'endpoint': endpoint,
                    'method': method,
                    'success': success,
                    'status_code': response.status,
                    'response_time': response_time,
                    'timestamp': datetime.now().isoformat()
                }
        except Exception as e:
            end_time = time.time()
            return {
                'test': 'api_endpoint',
                'endpoint': endpoint,
                'method': method,
                'success': False,
                'error': str(e),
                'response_time': end_time - start_time,
                'timestamp': datetime.now().isoformat()
            }
    
    async def test_concurrent_devices(self, num_devices=10, requests_per_device=5):
        """Test system with multiple concurrent Arduino devices"""
        print(f"Testing {num_devices} concurrent devices with {requests_per_device} requests each...")
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            for device_id in range(1, num_devices + 1):
                for i in range(requests_per_device):
                    delay = i * 0.1  # Stagger requests
                    tasks.append(self.test_arduino_post(session, device_id, delay))
            
            results = await asyncio.gather(*tasks)
            self.results.extend(results)
            
        return self._analyze_results('concurrent_devices', results)
    
    async def test_api_load(self, num_requests=100):
        """Test API under load"""
        print(f"Testing API with {num_requests} concurrent requests...")
        
        endpoints = [
            '/devices/',
            '/readings/latest/?device_id=1',
            '/dashboard/summary/',
            '/analytics/summary/?hours=24'
        ]
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            for i in range(num_requests):
                endpoint = endpoints[i % len(endpoints)]
                tasks.append(self.test_api_endpoint(session, endpoint))
            
            results = await asyncio.gather(*tasks)
            self.results.extend(results)
            
        return self._analyze_results('api_load', results)
    
    def _analyze_results(self, test_name, results):
        """Analyze test results"""
        successful = [r for r in results if r.get('success', False)]
        failed = [r for r in results if not r.get('success', False)]
        
        response_times = [r['response_time'] for r in results if 'response_time' in r]
        
        analysis = {
            'test_name': test_name,
            'total_requests': len(results),
            'successful': len(successful),
            'failed': len(failed),
            'success_rate': (len(successful) / len(results) * 100) if results else 0,
            'response_time_stats': {
                'min': min(response_times) if response_times else 0,
                'max': max(response_times) if response_times else 0,
                'avg': statistics.mean(response_times) if response_times else 0,
                'median': statistics.median(response_times) if response_times else 0
            } if response_times else {}
        }
        
        print(f"\n{test_name} Results:")
        print(f"  Total Requests: {analysis['total_requests']}")
        print(f"  Successful: {analysis['successful']}")
        print(f"  Failed: {analysis['failed']}")
        print(f"  Success Rate: {analysis['success_rate']:.2f}%")
        if analysis['response_time_stats']:
            print(f"  Response Time - Min: {analysis['response_time_stats']['min']:.3f}s")
            print(f"  Response Time - Max: {analysis['response_time_stats']['max']:.3f}s")
            print(f"  Response Time - Avg: {analysis['response_time_stats']['avg']:.3f}s")
            print(f"  Response Time - Median: {analysis['response_time_stats']['median']:.3f}s")
        
        return analysis
    
    def save_results(self, filename='scalability_test_results.json'):
        """Save test results to file"""
        with open(filename, 'w') as f:
            json.dump({
                'results': self.results,
                'timestamp': datetime.now().isoformat()
            }, f, indent=2)
        print(f"\nResults saved to {filename}")


async def main():
    """Run scalability tests"""
    print("AquaWatch Scalability Testing")
    print("=" * 50)
    
    # Configure for your environment
    BASE_URL = "http://localhost:8000/api"  # Change to your backend URL
    TOKEN = None  # Add auth token if needed
    
    tester = ScalabilityTester(BASE_URL, TOKEN)
    
    # Test 1: Concurrent Arduino devices
    await tester.test_concurrent_devices(num_devices=10, requests_per_device=5)
    
    # Test 2: API load testing
    await tester.test_api_load(num_requests=50)
    
    # Save results
    tester.save_results()
    
    print("\nScalability testing completed!")


if __name__ == "__main__":
    asyncio.run(main())
