let restaurant;
let latlng;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
	self.latlng=restaurant.latlng;
    if (error) { // Got an error!
      console.error(error);
    } else if(navigator.onLine){
		document.body.addEventListener("mouseenter", loadMap);	
		fillBreadcrumb(); 
    }
  });
}

loadMap = () => {
			document.body.removeEventListener("mouseenter", loadMap);
			self.map = new google.maps.Map(document.getElementById('map'), {
				zoom: 16,
				center: self.latlng,
				scrollwheel: false
			});
		  
		  DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
		}

/**
 * Get current restaurant from page URL.
 */
fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
		// fill reviews
		fillReviews();
	  //setFavorite(self.restaurant.id, self.restaurant.isfavorite, false);
	  callback(null, restaurant)
    });
  }
}

fillReviews = (restaurant = self.restaurant) => {
	fetchReviews(restaurant.id);
		
	async function fetchReviews(this_id){
		//console.log("fetchReviews");
		let get_reviews = await getReviews(this_id);
		//console.log("getReviews: "+get_reviews);
		restaurant.reviews = get_reviews;
		fillReviewsHTML();
	}
	
	function getReviews(this_id){
		//console.log("getReviews");
		return new Promise(resolve => {
			DBHelper.fetchReviewsById(this_id, (error, reviews) => {
				if(reviews){
					//restaurant.reviews = reviews;
					//console.log(reviews);
					resolve(reviews);						
				}else{
					console.log(error)
					resolve([]);
				}				
			});					
		})					
	}			
}

/**
 * Create restaurant HTML and add it to the webpage
 */
fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const favorite_link = document.createElement('a');
  favorite_link.setAttribute('href', '#');
  favorite_link.setAttribute('id', 'setfavorite');
  favorite_link.setAttribute('onclick', 'setFavorite();return false;');
  document.getElementById('restaurant-name').appendChild(favorite_link);
  
  const star_icon = document.createElement('img');
  const star_src = (restaurant.isfavorite == true) ? 'images/icons/star.png' : 'images/icons/blankstar.png';
  const star_alt = (restaurant.isfavorite == true) ? 'favorite' : 'not favorite';
  
  star_icon.setAttribute('src', star_src);
  star_icon.setAttribute('alt', star_alt);
  star_icon.setAttribute('id', 'imagefavorite');
  favorite_link.appendChild(star_icon);  

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const picture = document.getElementById('restaurant-img');
  picture.className = 'restaurant-img'
  
  const source_webp = document.createElement('source');
  const source_jpeg = document.createElement('source');
  const image = document.createElement('img');
  
  const img_name = DBHelper.imageUrlForRestaurant(restaurant)
  
  source_webp.srcset = img_name + "-400_mid.webp";
  source_webp.type = "image/webp";
  
  source_jpeg.srcset = img_name + "-200_small.jpg 200w, " + img_name + "-400_mid.jpg 400w, " + img_name + "-100pc_big.jpg 800w";
  source_jpeg.type = "image/jpeg";
  
  image.src = img_name + "-200_small.jpg";
  image.alt = restaurant.name + " image";

  picture.append(source_webp);
  picture.append(source_jpeg);
  picture.append(image);

  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
}

setFavorite = (id = self.restaurant.id, isfavorite = !self.restaurant.isfavorite) => {
	//console.log("Updating Favorite: "+isfavorite);
	self.restaurant.isfavorite = isfavorite;
	let star_src, star_alt;
	const star_icon = document.getElementById('imagefavorite');
	if(isfavorite){
		star_src = 'images/icons/star.png';
		star_alt = 'favorite';
	}else{
		star_src = 'images/icons/blankstar.png';
		star_alt = 'not favorite';
	}	
  
	star_icon.setAttribute('src', star_src);
	star_icon.setAttribute('alt', star_alt);
	
	const body = {
		  restaurant_id: id
	}
	
	DBHelper.setFavorite(id, isfavorite, body);
} 

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
fillReviewsHTML = (reviews = self.restaurant.reviews) => { 
	//console.log(reviews);
  const container = document.getElementById('reviews-container');
	
  const review_title = document.getElementById('review_title');
  if(review_title) review_title.parentNode.removeChild(review_title);
  
  const title = document.createElement('h3');
  title.setAttribute("id", "review_title");
  title.innerHTML = 'Reviews';
  container.appendChild(title);
  
  container.appendChild(addReviewHTML());
  
  document.getElementById("author_label").innerText = "Name: ";
  document.getElementById("rating_label").innerText = "Rating: ";
  document.getElementById("comment_label").innerText = "Comments: ";
  
  if (!reviews || reviews.length == 0) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
    
	while (ul.hasChildNodes()) {
		ul.removeChild(ul.lastChild);
	}
	
  //console.log(reviews);
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create new review form HTML and add it to the webpage.
 */
addReviewHTML = (id = self.restaurant.id) => {
	//console.log("review for " + id);
  
  const new_review = document.getElementById('new_review');
  if(new_review) new_review.parentNode.removeChild(new_review);
	
  const review_div = document.createElement('div');
  review_div.setAttribute('id', 'new_review');
  review_div.setAttribute('aria-label', 'new review form');
  
  const review_form = document.createElement('form');
  review_form.setAttribute('action', '');
  
  const field_set = document.createElement('fieldset');
  field_set.setAttribute('id', 'field_set');
  
  const legend = document.createElement('legend');
  field_set.setAttribute('id', 'legend');
  
  const legend_text = document.createTextNode("Add New Review");
  legend.appendChild(legend_text);
  field_set.appendChild(legend);
  
  const block_author = document.createElement('div');
  block_author.className = "form_div";
  
  const review_author = document.createElement('input');
  review_author.setAttribute('type', 'text');
  review_author.setAttribute('id', 'author');
  block_author.appendChild(review_author);
  
  const label_author = document.createElement('label');
  label_author.setAttribute('for', 'author');
  label_author.setAttribute('id', 'author_label');
  block_author.insertBefore(label_author, review_author);
  
  field_set.appendChild(block_author);
   
  const block_rating = document.createElement('div');
  block_rating.className = "form_div";
    
  const num_span = document.createElement('span');
  num_span.setAttribute('id', 'num_span');
  const num_span_text = document.createTextNode("1      2      3      4      5");
  num_span.appendChild(num_span_text);
  
  field_set.appendChild(num_span);
  
  const rating = document.createElement('input');
  rating.setAttribute('type', 'range');
  rating.setAttribute('id', 'rating');
  rating.setAttribute('min', '1');
  rating.setAttribute('max', '5');
  block_rating.appendChild(rating);
  
  const label_rating = document.createElement('label');
  label_rating.setAttribute('for', 'rating');
  label_rating.setAttribute('id', 'rating_label');
  block_rating.insertBefore(label_rating, rating)
  
  field_set.appendChild(block_rating);
  
  const block_text = document.createElement('div');
  block_text.className = "form_div";
  
  const comments = document.createElement('textarea');
  comments.setAttribute('type', 'text');
  comments.setAttribute('id', 'comment');
  comments.setAttribute('rows', '5');
  comments.setAttribute('cold', '50');
  block_text.appendChild(comments);
  
  const label_comments = document.createElement('label');
  label_comments.setAttribute('for', 'comment');
  label_comments.setAttribute('id', 'comment_label');
  block_text.insertBefore(label_comments, comments);
  
  field_set.appendChild(block_text);
  
  const block_submit = document.createElement('div');
  block_submit.className = "form_div";
  
  const submit_review = document.createElement('input');
  submit_review.setAttribute('type', 'button'); 
  submit_review.setAttribute('id', 'submit_button');
  submit_review.setAttribute('value', 'Add Review');
  submit_review.setAttribute('onclick', 'addReview(' + id +');');
  block_submit.appendChild(submit_review);
  
  field_set.appendChild(block_submit);
  
  review_form.appendChild(field_set);
  
  review_div.appendChild(review_form);
      
  return review_div;
}

addReview = (id) => {
  const name = document.getElementById("author").value;
  const rating = document.getElementById("rating").value;
  const comment = document.getElementById("comment").value;
  
  if(name && comment){
	  const body = {
		  restaurant_id: id,
		  name: name,
		  rating: rating,
		  comments: comment,
		  createdAt: Date.now()
	  }
	  
	  document.getElementById("author").value = '';
	  document.getElementById("rating").value = 5;
	  document.getElementById("comment").value = '';
	  DBHelper.addReview(body);
	  //console.log("body: "+body);
	  //location.reload();
  }
}

deleteReview = (id, reviewDate) => {
  DBHelper.deleteReview(id, reviewDate);
  //location.reload();
}

/**
 * Create review HTML and add it to the webpage.
 */
createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  const dateUTC = new Date(review.createdAt);
  date.innerHTML = dateUTC;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);
  
  const delete_review = document.createElement('input');
  delete_review.setAttribute('type', 'button'); 
  delete_review.setAttribute('class', 'delete_button');
  delete_review.setAttribute('value', 'Delete');
  delete_review.setAttribute('onclick', `deleteReview(${review.id}, ${review.createdAt});`);
  li.appendChild(delete_review); 
  
  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('nav_ul');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
