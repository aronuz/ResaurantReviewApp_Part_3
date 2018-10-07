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
  }

  /**
   * Fetc  h all restaurants.
   */
  static fetchRestaurants(callback, id){
	  if(id){
		  fetch(DBHelper.DATABASE_URL + `/restaurants/${id}?id=${id}`, {method: "GET"}).then(response => {
			response.json().then(restaurant => {
				console.log(restaurant);
				callback(null, restaurant);
			})		  
		  })
	  }else{
			var restaurants = [];
			
			var dbPromise=idb.open('restaurant_db', 1, upgradeDb => {
				var restaurantStore = upgradeDb.createObjectStore('restaurant_store', { keyPath: 'id'});
				var pendingStore = upgradeDb.createObjectStore('pending_store', { keyPath: 'createdAt'});
				pendingStore.createIndex('createdAt', 'createdAt');
			});
				
			dbPromise.then(db => {//console.log(db);
			  var tx_read=db.transaction('restaurant_store');
			  var restaurantStore=tx_read.objectStore('restaurant_store');
			  return restaurantStore.getAll() || restaurants;
			}).then(async function(restaurants){
			   if (!restaurants || restaurants.length === 0) {
				  var response = await fetch(DBHelper.DATABASE_URL + '/restaurants');
				  var restaurants = await response.json();
				 
				  dbPromise.then(db => {
					  //console.log(db);
					  var tx_write=db.transaction('restaurant_store', 'readwrite');
					  var restaurantStore=tx_write.objectStore('restaurant_store');
					  restaurants.forEach(restaurant => {restaurantStore.put(restaurant)});
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
		console.log("restaurants fetched");
		let restaurant = restaurants;
		
        if (restaurant) { // Got the restaurant
			restaurant.isfavorite = null;
			//console.log("restaurant: "+restaurant.id);
			DBHelper.fetchReviewsById(restaurant.id, (error, reviews) => {
				if(reviews){
					restaurant.reviews = reviews;
					console.log(reviews);
				}else{
					console.log(error)
				}				
			});
			
			
			let dbPromise=idb.open('restaurant_db', 1);					
			let favorite_restaurant_ids = [];
			
			dbPromise.then(db => {
				var tx_read_offline=db.transaction('pending_store');
				var pendingStore=tx_read_offline.objectStore('pending_store');
				return pendingStore.openCursor();
			}).then(function getPenging(cursor){
				if(!cursor) return favorite_restaurant_ids;
				var url = cursor.value.url;
				if(url.indexOf("is_favorite") == -1) return cursor.continue().then(getPenging);
				var body = cursor.value.body;				
				var rest_id = body.restaurant_id;
				var un_rest_id = "0"+rest_id;
				//console.log("url: "+url+" rest_id: "+rest_id);
				if(body && url.indexOf("is_favorite=true") > -1){
					//console.log("fav");
					favorite_restaurant_ids.splice(favorite_restaurant_ids.indexOf(un_rest_id), 1);	
					favorite_restaurant_ids.push(rest_id);							
					//console.log("---favorite_restaurant_ids: "+favorite_restaurant_ids+" rest_id="+rest_id);
				}else if(body && url.indexOf("is_favorite=false") > -1){
					//console.log("unfav");
					favorite_restaurant_ids.splice(favorite_restaurant_ids.indexOf(rest_id), 1);
					favorite_restaurant_ids.push(un_rest_id);
				}
				//console.log("favorite_restaurant_ids: "+favorite_restaurant_ids);
				
				return cursor.continue().then(getPenging);							
			}).then(
				(favorite_restaurant_ids) => {
					//console.log("restaurant.id: "+restaurant.id);
					var un_rest_id="0"+restaurant.id;
					if(favorite_restaurant_ids.indexOf(restaurant.id) > -1) {
						restaurant.isfavorite = true;
						//console.log("set restaurant.isfavorite: "+restaurant.isfavorite);
					}else if(favorite_restaurant_ids.indexOf(un_rest_id) > -1){
						restaurant.isfavorite = false;
						//console.log("unset restaurant.isfavorite: "+restaurant.isfavorite);
					}					
					return restaurant.isfavorite;
				}
			).then(
				(isfavorite) => {
					//console.log("restaurant.isfavorite == null: "+(restaurant.isfavorite == null));
					if(isfavorite == null){
						favorite_restaurants(restaurant.id);
						async function favorite_restaurants(id){			
							try{
								var response = await fetch(DBHelper.DATABASE_URL + '/restaurants/?is_favorite=true', {method: 'GET'});
								var favorite_restaurants = await response.json();
								
								//console.log("favorite_restaurants: "+favorite_restaurants);
								
								if (favorite_restaurants && favorite_restaurants.length > 0){
									for (let favorite_restaurant of favorite_restaurants){
									
										if(id == favorite_restaurant.id){
											//console.log("isfavorite id="+id);
											restaurant.isfavorite = true;
											break;
										}							
									};
									
									//console.log("restaurant.isfavorite: "+restaurant.isfavorite);						
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
				//console.log("restaurant.isfavorite == null");
				favorite_restaurants(restaurant.id);
			}else{
				callback(null, restaurant);
			}*/

        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    }, id);
  }
  
   /**
   * Fetch a restaurant reviews by its ID.
   */
  static fetchReviewsById(id, callback) {
	let dbPromise=idb.open('restaurant_db', 1);
	let reviews = [];
    // fetch all restaurants with proper error handling.
    dbPromise.then(db => {
		var tx_read_offline=db.transaction('pending_store');
		var pendingStore=tx_read_offline.objectStore('pending_store');
		return pendingStore.openCursor();
	}).then(function getPenging(cursor){
		if(!cursor) return reviews;
		var body = cursor.value.body;
		var method = cursor.value.method;
		var url = cursor.value.url;
		//console.log("url: "+url);
		if(body && method != "DELETE" && url.indexOf("reviews") > -1){
			//console.log("push review");
			reviews.push(JSON.parse(body));							
		}		
		return cursor.continue().then(getPenging);							
	}).then(
		(offline_reviews) => {
			//console.log("!reviews: "+(!reviews));
			console.log("offline_reviews: "+offline_reviews);
			get_reviews(id, offline_reviews);
			async function get_reviews(id, offline_reviews){			
				try{
					var response = await fetch(DBHelper.DATABASE_URL + `/reviews/?restaurant_id=${id}`, {method: 'GET'});
					var online_reviews = await response.json();
					
					//console.log("online_reviews: "+online_reviews);
					
					callback(null, online_reviews);					
				}catch(e){
					callback(null, offline_reviews);
					console.log(e);							
				}
			}
		}			
	).catch(e => {
	  console.log(e);
	})	

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
  
  static setFavorite(id, is_favorite, body) {
	  //console.log(`setting ${is_favorite} favorite`);
    const url = `${DBHelper.DATABASE_URL}/restaurants/${id}/?is_favorite=${is_favorite}`;
    const method = "PUT";
	const reviewDate = '';
    DBHelper.updateOnlineDB(url, method, body, reviewDate);
  }
  
  static addReview(body){
	const url = `${DBHelper.DATABASE_URL}/reviews/`;
    const method = "POST";
	const reviewDate = '';
    DBHelper.updateOnlineDB(url, method, body, reviewDate);
  }
  
  static deleteReview(id, reviewDate){
	const url = `${DBHelper.DATABASE_URL}/reviews/${id}`;
    const method = "DELETE";
	const body = '';
    DBHelper.updateOnlineDB(url, method, body, reviewDate);
  }
  
  static updateOnlineDB(url, method, body, reviewDate){ 
	let dbPromise=idb.open('restaurant_db', 1);
	const body_val = JSON.stringify(body);
	console.log("dbh body: "+body_val);
	if(reviewDate=='') {var reviewDate = body.createdAt;console.log("reviewDate: "+reviewDate);}
	//DBHelper.updateOfflineDB(url, method, body_val);
	
	fetch(url, {method: method, body: body_val}).then(response => {
		if(!response.ok && !response.redirected){
			DBHelper.updateOfflineDB(url, method, body_val, reviewDate);
			return;
		}		
		//console.log("response: "+response);
	}).then(
		dbPromise.then(db => {
		  var tx_read_offline=db.transaction('pending_store');
		  var pendingStore=tx_read_offline.objectStore('pending_store');
		  return pendingStore.openCursor();
		}).then(
			function getPenging(cursor){
				console.log("cursor: "+cursor);
				if(!cursor) return;
				 
				var recId = cursor.value.createdAt;
				var url = cursor.value.url;
				var method = cursor.value.method;
				var body = (cursor.value.method == 'PUT')? '' : cursor.value.body;
				//console.log("url: "+url+" method: "+method+" body: "+JSON.stringify(body));
				if(url && method && body){

						fetch(url, {method: method, body: body}).then(response => {
							if(!response.ok && !response.redirected){
								return;
							}	
							console.log("response ok");
							
							dbPromise.then(db => {
								var tx_delete=db.transaction('pending_store', 'readwrite');
								var pendingStore=tx_delete.objectStore('pending_store');
								
								pendingStore.delete(recId);
								console.log("delete id: "+recId)
							})
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
		DBHelper.updateOfflineDB(url, method, body_val, reviewDate);
		console.log(e);
	})	
  }
  
  static updateOfflineDB(url, method, body, reviewDate){
	let dbPromise=idb.open('restaurant_db', 1);
	  
	dbPromise.then(db => {
		//console.log("Saving offline");
		var tx_write_offline=db.transaction('pending_store', 'readwrite');
		var pendingStore=tx_write_offline.objectStore('pending_store');
		var obj;
		if(url.indexOf("is_favorite") > -1){
			pendingStore.put({
				url: url,
				method: method,
				body: body,
				createdAt: reviewDate
			})
		}else if(method != "DELETE"){
			pendingStore.add({
				url: url,
				method: method,
				body: body,
				createdAt: reviewDate
			})
		}else if(method == "DELETE"){
			pendingStore.add({
				url: url,
				method: method,
				body: body,
				createdAt: Date.now()
			})
			getId(reviewDate);
			async function getId(recId){
				var tx_delete_offline=db.transaction('pending_store', 'readwrite');
				var pendingStore=tx_delete_offline.objectStore('pending_store');
				
				console.log("del reviewDate: "+ reviewDate);
				pendingStore.delete(recId);
			}
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