importScripts( '/js/idb.js' );

let version_num = '1';
let old_caches = [];

const cacheScope = [
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
		'/js/restaurant_info.js'
	];
	
if (!String.prototype.startsWith) {
    String.prototype.startsWith = function(searchString, position){
      position = position || 0;
      return this.substr(position, searchString.length) === searchString;
  };
}

let dbPromise=idb.open('restraurant_db', 2, upgradeDb => {
  var reviewsStore = upgradeDb.createObjectStore('reviews_store', { keyPath: 'store_request'});
  reviewsStore.createIndex('store_request', 'store_request');
}); 
	
self.addEventListener("install", event => { 
	
	//return next to last version number for new worker
    event.waitUntil(
		caches.keys().then(keys => {     
			Promise.all(
				old_caches = keys.filter(key => key.startsWith("reviews-v"))
			).then(old_caches => {
				old_caches.forEach((key, index) => {
					version_num = parseInt(key.substr(key.indexOf("-v") + 2)); 
					old_caches[index] = version_num;   
				})
				//get latest version number and add next one
				version_num = (Math.max.apply(Math, old_caches) + 1).toString();
				return version_num;
			}).then(version_num => {
				console.log("installing version_num:" + version_num);
				caches.open('reviews-v' + version_num)
				.then(cache => {
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
		
	if (!(event.request.url.startsWith('https://maps.googleapis.com') || event.request.url.startsWith('https://maps.gstatic.com'))){
		
		event.request.json().then( resp => {
			dbPromise.then(db => {
				var tx_write=db.transaction('reviews_get', 'readwrite'); 
				var reviewsStore=tx_write.objectStore('reviews_store');
				var storeIndex = reviewsStore.index('store_request');
				
				reviewsStore.add({
					store_request: event.request,
					store_response: resp
				});
				return tx_write.complete;
			}).then(complete => {      
				console.log("db write success:", complete);
			})
		})
		
		event.respondWith(
		
			caches.match(event.request).then(cached => {
				
				if(cached) return cached;
								
				dbPromise.then(db => {
					var tx_read=db.transaction('reviews_get'); 
					var reviewsStore=tx_read.objectStore('reviews_store');
					var storeIndex = reviewsStore.index('store_request');
					
					return storeIndex.get(event.request);
				}).then(idbResponse => {      
					return new Response(idbResponse);
				}).catch(e => {
					return new Response('<h1>No Response</h1>', {
						status: 404,
						statusText: 'Resource Not Found',
						headers: new Headers({'Content-Type': 'text/html'})
					});
				})
			})
		);
	}
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
					old_caches[index] = version_num;   
				})
				//get latest version number and add next one
				version_num = Math.max.apply(Math, old_caches).toString();
				return version_num;
			}).then(version_num => {
				console.log("activating version_num:" + version_num);
				caches.keys().then(keys => {
					return keys.filter(key => {key.startsWith("reviews-v") && !key.endsWith(version_num)});
				}).then(keys => {
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