let restaurants,
  neighborhoods,
  cuisines
var map
var markers = []

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', (event) => {
  fetchNeighborhoods();
  fetchCuisines();
});

/**
 * Fetch all neighborhoods and set their HTML.
 */
function fetchNeighborhoods(){
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
function fillNeighborhoodsHTML(neighborhoods = self.neighborhoods){
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
function fetchCuisines(){
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
function fillCuisinesHTML(cuisines = self.cuisines) {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
}

/**
 * Update page and map for current restaurants.
 */
function updateRestaurants(){
	console.log("updateRestaurants");
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
	  if(error.toString()==='ReferenceError: google is not defined'){
		  console.log('ReferenceError');
		loadRestaurantImages();
	  }
    } else {
      resetRestaurants(restaurants);
      fillRestaurantsHTML();	
	  hideShowList();
    }
  })
}

/**
 * Hide/show images.
 */
function hideShowList(){
		console.log("hideShowList");
		var el = document.querySelectorAll('#restaurants-list picture');
		var li = document.querySelectorAll('#restaurants-list li');
		console.log(el.length, li.length, el.length < li.length);
		if(el.length < li.length){
			console.log("loadRestaurantImages()");
			loadRestaurantImages();
		}else{
			for (var i = 0; i < el.length; ++i) {
				var elBox = el[i].parentNode.getBoundingClientRect();
				
				if(elBox.top > window.innerHeight || elBox.top + elBox.height < 0){
					el[i].style.display = "none";
				} else {
					el[i].style.display="block";
				}
			}
		}
		
	};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
function resetRestaurants(restaurants){
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
function fillRestaurantsHTML(restaurants = self.restaurants){
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  const el = document.querySelectorAll('#restaurants-list picture');
	for (var i=0;i<el.length;i+=1){
		el[i].style.display = 'none';
	}
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
function createRestaurantHTML(restaurant){
  const li = document.createElement('li');

  const name = document.createElement('h1');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more)

  return li
}

/**
 * Load images 
 */
function loadRestaurantImages(restaurants = self.restaurants){
	console.log("loadRestaurantImages");
	const el = document.querySelectorAll('#restaurants-list li');
  
	for (var i = 0; i < el.length; ++i) {
		var elBox = el[i].getBoundingClientRect();
		
		if(elBox.top > window.innerHeight || elBox.top + elBox.height < 0){
			console.log(i, "item is off screen");
		} else if(document.querySelectorAll("#restaurants-list picture")[i] === undefined){
			const picture = document.createElement('picture');  
			const source_webp = document.createElement('source');
			const source_jpeg = document.createElement('source');
			const image = document.createElement('img');
			  
			const img_name = DBHelper.imageUrlForRestaurant(restaurants[i])
			  
			source_webp.srcset = img_name + "-100pc_big.webp";
			source_webp.type = "image/webp";
			  
			source_jpeg.srcset = img_name + "-200_small.jpg 200w, " + img_name + "-400_mid.jpg 400w, " + img_name + "-100pc_big.jpg 800w";
			source_jpeg.type = "image/jpeg";
			  
			image.src = img_name + "-200_small.jpg";
			image.alt = restaurants[i].name + " image";
			  
			picture.className = 'restaurant-img';

			picture.append(source_webp);
			picture.append(source_jpeg);
			picture.append(image);
			el[i].prepend(picture);
		}
	}	
}

/**
 * Add markers for current restaurants to the map.
 */
function addMarkersToMap(restaurants = self.restaurants){
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
}

