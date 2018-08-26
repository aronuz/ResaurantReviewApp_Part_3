importScripts( '/js/idb.js' );

var versions = [];
var old_caches = [];
var version_num;

var cacheScope = [
		'/',
        '/index.html',
        '/restaurant.html',
		'/css/styles_all.css',
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
		'/images/1-100pc_big.webp',
		'/images/2-100pc_big.webp',
		'/images/3-100pc_big.webp',
		'/images/4-100pc_big.webp',
		'/images/5-100pc_big.webp',
		'/images/7-100pc_big.webp',
		'/images/8-100pc_big.webp',
		'/images/9-100pc_big.webp',
		'/images/10-100pc_big.webp',
		'/images/1-400_mid.webp',
		'/images/3-400_mid.webp',
		'/images/5-400_mid.webp',
		'/images/7-400_mid.webp',
		'/images/9-400_mid.webp',
		'/images/10-400_mid.webp',
		'/js/dbhelper.js',
		'/js/main.js',
		'/js/restaurant_info.js',
		'/js/toggleview.js',
		'/js/idb.js'
	];
	
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position){
      position = position || 0;
      return this.substr(position, searchString.length) === searchString;
  };
}

let dbPromise=idb.open('restraurant_db', 1);
	
self.addEventListener("install", event => { 
	
	//return next to last version number for new worker
    event.waitUntil(
		caches.keys().then(keys => {     
			Promise.all(
				old_caches = keys.filter(key => key.startsWith("reviews-v"))
			).then(old_caches => {
				console.log("Filtered 'reviews' caches");
				old_caches.forEach((key, index) => {
					version_num = parseInt(key.substr(key.indexOf("-v") + 2)); 
					versions[index] = version_num;   
				})
				//get latest version number and add next one
				version_num = (Math.max.apply(Math, versions) + 1);
				version_num = (isFinite(version_num)===true)? version_num.toString(): '1';
				console.log("next version_num: " + version_num);
				return version_num;
			}).then(version_num => {
				console.log("installing version_num:" + version_num);
				caches.open('reviews-v' + version_num)
				.then(cache => {
					console.log('Opened cache');
					cache.addAll(cacheScope);
				})
			}).then(() => {
				console.log('SW installed');
			})
		})
    );

});

self.addEventListener("fetch", event => {
	console.log('Fetching');	

	event.respondWith(
		caches.match(event.request)
			.then(function(response) {
				// Cache hit - return response
				if (response) {
				  return response;
				}
				
				var fetchRequestToDB = event.request.clone();
				
				dbPromise.then(db => {
					var tx_read=db.transaction('reviews_get'); 
					var reviewsStore=tx_read.objectStore('reviews_store');
					
					return storeIndex.get(fetchRequestToDB);
				}).then(idbResponse => {      
					return new Response(idbResponse.store_response);
				}).catch(e => {
					console.error("IDB Fail: " + e);
				})

				// IMPORTANT: Clone the request. A request is a stream and
				// can only be consumed once. Since we are consuming this
				// once by cache and once by the browser for fetch, we need
				// to clone the response.
				var fetchRequest = event.request.clone();

				return fetch(fetchRequest).then(
				  function(response) {
					// Check if we received a valid response
					if(!response || response.status !== 200 || response.type !== 'basic') {
					  return response;
					}
					
					// IMPORTANT: Clone the response. A response is a stream
					// and because we want the browser to consume the response
					// as well as the cache consuming the response, we need
					// to clone it so we have two streams.
					var responseToCache = response.clone();
					
					fetchRequest.json().then( resp => {
						dbPromise.then(db => {
							var tx_write=db.transaction('reviews_get', 'readwrite'); 
							var reviewsStore=tx_write.objectStore('reviews_store');
							
							reviewsStore.put({
								store_request: event.request,
								store_response: resp
							});
							return tx_write.complete;
						}).then(complete => {      
							console.log("db write success: " + complete);
						}).catch(e => {
							console.error("IDB Fail: " + e);
						})
					})
					
					return response;
				  }
				);
			})
    );
	
});

self.addEventListener("activate", event => {
	//return next to last number for installed worker
    event.waitUntil(
        caches.keys().then(keys => {     
			Promise.all(
				old_caches = keys.filter(key => key.startsWith("reviews-v"))
			).then(old_caches => {
				old_caches.forEach((key, index) => {
					version_num = parseInt(key.substr(key.indexOf("-v") + 2)); 
					versions[index] = version_num;   
				})
				//get latest version number and add next one
				version_num = Math.max.apply(Math, versions).toString();
				console.log("last version_num: " + version_num);
				return version_num;
			}).then(version_num => {
				console.log("activating version_num:" + version_num);
				caches.keys().then(keys => {
					return keys.filter(key => {key.startsWith("reviews-v") && !key.endsWith(version_num)});
				}).then(keys => {
					console.log("removing old caches");
					return Promise.all(
						keys.map(key => {
							return key.delete(key);
						})
					);
				}).then(() => {
					console.log('SW activated.');
				})
			})
		})
    );	
});