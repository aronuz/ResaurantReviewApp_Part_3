var version_num = '1';
var old_caches = [];

cacheScope = [
		'/',
        '/index.html',
        '/restaurant.html',
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
      
    //return next to last version number for new worker
    event.waitUntil(
        caches.keys().then(function (keys) {     
          return Promise.all(
            old_caches = keys.filter(function (key) {
                return key.startsWith("reviews-v");
            })
          );
          old_caches.forEach(function (key, index) {
            version_num = parseInt(key.substr(key.indexOf("-v") + 2)); 
            old_caches[index] = version_num;   
          })
          //get latest version number and add next one
          version_num = (Math.max.apply(Math, old_caches)+ 1).toString();
        }).then(function() {
			console.log("install version_num:" + version_num);
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
  
    //return next to last number for activated worker
    event.waitUntil(
        caches.keys().then(function (keys) {     
          return Promise.all(
            old_caches = keys.filter(function (key) {
                return key.startsWith("reviews-v");
            })
          );
          old_caches.forEach(function (key, index) {
            version_num = parseInt(key.substr(key.indexOf("-v") + 2)); 
            old_caches[index] = version_num;   
          })
            //get latest version number
          version_num = (Math.max.apply(Math, old_caches)).toString();
        }).then(function() {
			console.log("fetch version_num:" + version_num);
		})
    );
  
    event.respondWith(
		caches.match(event.request).then(function(cached) {       
			var networked = fetch(event.request).then(networkFetch, fetchFail).catch(fetchFail);
      
			console.log('fetched from', cached ? 'cache' : 'network', event.request.url);
			return cached || networked;

			function networkFetch(response) {
				var cacheCopy = response.clone();

				console.log('fetched from network.', event.request.url);

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
  
    //return next to last number for installed worker
    event.waitUntil(
        caches.keys().then(function (keys) {     
          return Promise.all(
            old_caches = keys.filter(function (key) {
                return key.startsWith("reviews-v");
            })
          );
          old_caches.forEach(function (key, index) {
            version_num = parseInt(key.substr(key.indexOf("-v") + 2)); 
            old_caches[index] = version_num;   
          })
          //get latest version number
          version_num = (Math.max.apply(Math, old_caches)).toString();
        }).then(function() {
			console.log("activate version_num:" + version_num);
		})
    );

	event.waitUntil(
		caches.keys().then(function (keys) {
			return Promise.all(
				keys.filter(function (key) {
					return key.startsWith("reviews-v") && !key.endsWith(version_num);
				}).map(function (key) {
					return key.delete(key);
				})
			);
		}).then(function() {
			console.log('SW activated.');
		})
	);
});