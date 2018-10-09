importScripts( '/js/idb.js' );

var versions = [];
var old_caches = [];
var version_num;

var cacheScope = [
		'/',
        '/index.html',
        '/restaurant.html',
		'/favicon.ico',
		'/css/styles_all.css',
		'/css/styles_max500px.css',
		'/css/styles_min501px.css',
		'/css/styles_min801px.css',
		'/images/icons/star.png',
		'/images/icons/blankstar.png',
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

let dbPromise=idb.open('restaurant_db', 1);
	
self.addEventListener("install", event => { 
	
	//return next to last version number for new worker
    event.waitUntil(
		caches.keys().then(keys => {     
			Promise.all(
				old_caches = keys.filter(key => key.startsWith("reviews-v"))
			).then(old_caches => {
				//console.log("Filtered 'reviews' caches");
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
				//console.log("installing version_num:" + version_num);
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
	if(event.request.method != 'GET') return;
	const constructURL = new URL(event.request.url);
	const port = constructURL.port;
	
	if(port == '1337'){
		if(event.request.url.indexOf("reviews") == -1 && event.request.url.indexOf("is_favorite") == -1){
			const url_id = constructURL.searchParams.get("id");
			//console.log("url_id: "+ url_id);
			event.respondWith(
				dbPromise.then(db => {
					var tx_read=db.transaction('restaurant_store'); 
					var readStore=tx_read.objectStore('restaurant_store');
					//console.log(readStore.get(parseInt(url_id)));
					return readStore.get(parseInt(url_id));
				}).then(data => {
					//console.log(data);
					return data || fetch(event.request)
						.then(fetchResponse => fetchResponse.json())
						.then(json => {
							return dbPromise.then(db => {
								var tx_write = db.transaction("restaurant_store", "readwrite");
								var writeStore = tx_write.objectStore("restaurant_store");
								writeStore.put({id: parseInt(url_id), data: json});
								return json;
							});
						});
				}).then(db_response => {
					//console.log(db_response);
					return new Response(JSON.stringify(db_response));
				}).catch(error => {
					return new Response("Error fetching data", {status: 500});
				})
			);
		}else{
			return new Response("Non-cachable data", {status: 500});
		}
	}else if(event.request.url.indexOf("staticmap") > -1 || event.request.url.indexOf("map") == -1){
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
				var networked = fetch(event.request).then(networkFetch).catch(fetchFail);
		  
				console.log('fetched from', cached ? 'cache' : 'network', event.request.url);
				return cached || networked;

				function networkFetch(response) {
					var cacheCopy = response.clone();
					
					//console.log('fetched from network.', event.request.url);

					caches.open('reviews-v' + version_num).then(function add(cache) {
						cache.put(event.request, cacheCopy);
					}).then(function() {
						//console.log('Response cached.', event.request.url);
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