/**
 * ---Common database helper functions.
 */
 
class DBHelper {

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}`;
	//return `http://localhost:${port}/restaurants`;
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback){
    var restaurants = [];
	
	var dbPromise=idb.open('restraurant_db', 1, upgradeDb => {
		var restaurantStore = upgradeDb.createObjectStore('restraurant_store', { keyPath: 'id'});
		var reviewsStore = upgradeDb.createObjectStore('reviews_store', { keyPath: 'store_request'});
		var pendingStore = upgradeDb.createObjectStore('pending_store', { keyPath: 'id', autoIncrement: true });
		reviewsStore.createIndex('store_request', 'store_request');
	});
        
    dbPromise.then(db => {//console.log(db);
      var tx_read=db.transaction('restraurant_store');
      var restraurantStore=tx_read.objectStore('restraurant_store');
      return restraurantStore.getAll() || restaurants;
    }).then(async function(restaurants){
       if (!restaurants || restaurants.length === 0) {
          var response = await fetch(DBHelper.DATABASE_URL + '/restaurants');
          var restaurants = await response.json();
         
          dbPromise.then(db => {
              //console.log(db);
              var tx_write=db.transaction('restraurant_store', 'readwrite');
              var restraurantStore=tx_write.objectStore('restraurant_store');
              restaurants.forEach(restaurant => {restraurantStore.put(restaurant)});
         });
      }
	//console.log(restaurants);                                      
      return restaurants;
    }).then(function(response){
      //console.log(response);
      return response; //.json();
    }).then(restaurants => {      
      callback(null, restaurants);
    }).catch(e => {
      callback(e, null);
    })     
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
			restaurant.isfavorite = null;
			
			let dbPromise=idb.open('restraurant_db', 1);					
			let favorite_restaurant_ids = [];
			
			dbPromise.then(db => {
				var tx_read_offline=db.transaction('pending_store');
				var pendingStore=tx_read_offline.objectStore('pending_store');
				return pendingStore.openCursor();
			}).then(function getPenging(cursor){
				if(!cursor) return favorite_restaurant_ids;
				var body = cursor.value.body;
				var url = cursor.value.url;
				var rest_id = body.restaurant_id;
				var un_rest_id = "0"+rest_id;
				console.log("url: "+url+" rest_id: "+rest_id);
				if(body && url.indexOf("is_favorite=true") > -1){
					console.log("fav");
					favorite_restaurant_ids.splice(favorite_restaurant_ids.indexOf(un_rest_id), 1);	
					favorite_restaurant_ids.push(rest_id);							
					console.log("---favorite_restaurant_ids: "+favorite_restaurant_ids+" rest_id="+rest_id);
				}else if(body && url.indexOf("is_favorite=false") > -1){
					console.log("unfav");
					favorite_restaurant_ids.splice(favorite_restaurant_ids.indexOf(rest_id), 1);
					favorite_restaurant_ids.push(un_rest_id);
				}
				console.log("favorite_restaurant_ids: "+favorite_restaurant_ids);
				
				return cursor.continue().then(getPenging);							
			}).then(
				(favorite_restaurant_ids) => {
					console.log("restaurant.id: "+restaurant.id);
					var un_rest_id="0"+restaurant.id;
					if(favorite_restaurant_ids.indexOf(restaurant.id) > -1) {
						restaurant.isfavorite = true;
						console.log("set restaurant.isfavorite: "+restaurant.isfavorite);
					}else if(favorite_restaurant_ids.indexOf(un_rest_id) > -1){
						restaurant.isfavorite = false;
						console.log("unset restaurant.isfavorite: "+restaurant.isfavorite);
					}					
					return restaurant.isfavorite;
				}
			).then(
				(isfavorite) => {
					console.log("restaurant.isfavorite == null: "+(restaurant.isfavorite == null));
					if(isfavorite == null){
						favorite_restaurants(restaurant.id);
						async function favorite_restaurants(id){			
							try{
								var response = await fetch(DBHelper.DATABASE_URL + '/restaurants/?is_favorite=true', {method: 'GET'});
								var favorite_restaurants = await response.json();
								
								console.log("favorite_restaurants: "+favorite_restaurants);
								
								if (favorite_restaurants && favorite_restaurants.length > 0){
									for (let favorite_restaurant of favorite_restaurants){
									
										if(id == favorite_restaurant.id){
											console.log("isfavorite id="+id);
											restaurant.isfavorite = true;
											break;
										}							
									};
									
									console.log("restaurant.isfavorite: "+restaurant.isfavorite);						
								}
								callback(null, restaurant);
							}catch(e){
								console.log(e);		
								callback(null, restaurant);					
							}
						}
					}else{
						callback(null, restaurant);
					}
				}			
			).catch(e => {
			  console.log(e);
			})	
			
			
			/*if(restaurant.isfavorite == null){
				console.log("restaurant.isfavorite == null");
				favorite_restaurants(restaurant.id);
			}else{
				callback(null, restaurant);
			}*/

        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    if (restaurant.photograph) {//console.log(restaurant.photograph);
      return (`images/${restaurant.photograph}`);//.jpg
    } else {//console.log(restaurant.id);
      //if photograph property missing
      return (`images/${restaurant.id}`);//.jpg
    }
  }

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }
  
  static setFavorite(id, is_favorite, body, update) {
	  console.log(`setting ${is_favorite} favorite`);
    const url = `${DBHelper.DATABASE_URL}/restaurants/${id}/?is_favorite=${is_favorite}`;
    const method = "PUT";
    DBHelper.updateOnlineDB(url, method, body, update);
  }
  
  static addReview(body){
	const url = `${DBHelper.DATABASE_URL}/reviews`;
    const method = "POST";
    DBHelper.updateOnlineDB(url, method, body);
  }
  
  static updateOnlineDB(url, method, body, update = true){
	let dbPromise=idb.open('restraurant_db', 1);
	  
	fetch(url, {method: method, body: body}).then(response => {
		if(!response.ok && !response.redirected && update){
			DBHelper.updateOfflineDB(url, method, body);
			return;
		}		
	}).then(
		dbPromise.then(db => {
		  var tx_read_offline=db.transaction('pending_store');
		  var pendingStore=tx_read_offline.objectStore('pending_store');
		  return pendingStore.openCursor();
		}).then(function (cursor){
			if(!cursor) return;
		}).then(
			function getPenging(cursor){
				if(!cursor) return;
				var url = cursor.value.url;
				var method = cursor.value.method;
				var body = (cursor.value.method == 'PUT')? '' : JSON.stringify(cursor.value.body);
				if(url && method && body){
					fetch(url, {method: method, body: body}).then(response => {
						if(!response.ok && !response.redirected){
							return;
						}		
					});
				}else{
					cursor.delete;
				}
				return cursor.continue().then(getPenging);
			}
		).catch(e => {
		  console.log(e);
		})
	).catch(e => {
		if(update){
			DBHelper.updateOfflineDB(url, method, body);
		}
		console.log(e);
	})	
  }
  
  static updateOfflineDB(url, method, body){
	let dbPromise=idb.open('restraurant_db', 1);
	  
	dbPromise.then(db => {
		console.log("Saving offline");
		var tx_write_offline=db.transaction('pending_store', 'readwrite');
		var pendingStore=tx_write_offline.objectStore('pending_store');
		if(url.indexOf("is_favorite") > -1){
			pendingStore.put({
				url: url,
				method: method,
				body: body
			})
		}else{
			pendingStore.add({
				url: url,
				method: method,
				body: body
			})
		}
		
	}).catch(e => {
      console.log(e);
    })
  }	
}

/*export default DBHelper;
export const fetchRestaurants = DBHelper.prototype.fetchRestaurants;
export const fetchRestaurantById = DBHelper.prototype.fetchRestaurantById;
export const fetchRestaurantByCuisine = DBHelper.prototype.fetchRestaurantByCuisine;
export const fetchRestaurantByNeighborhood = DBHelper.prototype.fetchRestaurantByNeighborhood;
export const fetchRestaurantByCuisineAndNeighborhood = DBHelper.prototype.fetchRestaurantByCuisineAndNeighborhood;
export const fetchNeighborhoods = DBHelper.prototype.fetchNeighborhoods;
export const fetchCuisines = DBHelper.prototype.fetchCuisines;
export const urlForRestaurant = DBHelper.prototype.urlForRestaurant;
export const imageUrlForRestaurant = DBHelper.prototype.imageUrlForRestaurant;
export const mapMarkerForRestaurant = DBHelper.prototype.mapMarkerForRestaurant;*/