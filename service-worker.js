var version_num = '1';

cacheScope = [
		'/',
		'/css/styles.css',
		'/images/1-200_small.jpg',
		'/images/2-200_small.jpg',
		'/images/3-200_small.jpg',
		'/images/4-200_small.jpg',
		'/images/5-200_small.jpg',
		'/images/6-200_small.jpg',
		'/images/7-200_small.jpg',
		'/images/8-200_small.jpg',
		'/images/9-200_small.jpg',
		'/images/10-200_small.jpg',
		'/images/1-400_mid.jpg',
		'/images/2-400_mid.jpg',
		'/images/3-400_mid.jpg',
		'/images/4-400_mid.jpg',
		'/images/5-400_mid.jpg',
		'/images/6-400_mid.jpg',
		'/images/7-400_mid.jpg',
		'/images/8-400_mid.jpg',
		'/images/9-400_mid.jpg',
		'/images/10-400_mid.jpg',
		'/images/1-100pc_big.jpg',
		'/images/2-100pc_big.jpg',
		'/images/3-100pc_big.jpg',
		'/images/4-100pc_big.jpg',
		'/images/5-100pc_big.jpg',
		'/images/6-100pc_big.jpg',
		'/images/7-100pc_big.jpg',
		'/images/8-100pc_big.jpg',
		'/images/9-100pc_big.jpg',
		'/images/10-100pc_big.jpg',
		'/js/dbhelper.js',
		'/js/main.js',
		'/js/restaurant_info.js'
	]

self.addEventListener("install", function(event) {
  
    return new Promise.all(
        caches.keys().then(function (cacheKeys) {            
            cacheKeys.filter(function (cacheName) {
                return cache.startsWith("reviews-v");
            }).map(function (cacheName) {
                version_num=cacheName.substr(cacheName.indexOf("-v") + 2);
            })  
        })
    );
  
	console.log('SW installing');
	event.waitUntil(
		caches.open('reviews-v' + version_num).then(function(cache) {
			return cache.addAll(cacheScope);
		}).then(function() {
			console.log('SW installed');
		})
    );
});

self.addEventListener("fetch", function(event) {
	console.log('Fetching');
  
  /*if (event.request.method !== 'GET') {
  
    console.log('WORKER: fetch event ignored.', event.request.method, event.request.url);
    return;
  }*/
 
	event.respondWith(
		caches.match(event.request).then(function(cached) {       
			var networked = fetch(event.request).then(networkFetch, fetchFail).catch(fetchFail);
      
			console.log('fetched from', cached ? 'cache' : 'network', event.request.url);
			return cached || networked;

			function networkFetch(response) {
				var cacheCopy = response.clone();

				console.log('Response fetched from network.', event.request.url);

				caches.open('reviews-v' + version_num).then(function add(cache) {
					cache.put(event.request, cacheCopy);
				}).then(function() {
					console.log('Response cached.', event.request.url);
				});

				return response;
			}

			function fetchFail() {
				console.log('Fetch failed.');

				return new Response('<h1>No Response</h1>', {
					status: 404,
					statusText: 'Resource Not Found',
					headers: new Headers({'Content-Type': 'text/html'})
				});
			}
		})
	);
});

self.addEventListener("activate", function(event) {
	console.log('Activating SW');

	event.waitUntil(
		caches.keys().then(function (keys) {
			return Promise.all(
				keys.filter(function (key) {
					return key.startsWith(reviews) && !key.endsWith(version);
				}).map(function (key) {
					return caches.delete(key);
				})
			);
		}).then(function() {
			console.log('SW activated.');
		})
	);
});