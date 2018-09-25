let restaurant;
var map;

/**
 * Initialize Google map, called from HTML.
 */
window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
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
      callback(null, restaurant)
    });
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
  star_icon.setAttribute('id', 'setfavorite');
  favorite_link.appendChild(star_icon);  

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const picture = document.getElementById('restaurant-img');
  picture.className = 'restaurant-img'
  
  const source_webp = document.createElement('source');
  const source_jpeg = document.createElement('source');
  const image = document.createElement('img');
  
  const img_name = DBHelper.imageUrlForRestaurant(restaurant)
  
  source_webp.srcset = img_name + "-100pc_big.webp";
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
  // fill reviews
  fillReviewsHTML();
}

setFavorite = (id = self.restaurant.id, isfavorite = self.restaurant.isfavorite) => {
	console.log("Updating Favorite");
	DBHelper.setFavorite(id, !isfavorite);
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
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);
  
  container.appendChild(addReviewHTML());
  
  document.getElementById("author_label").innerText = "Name: ";
  document.getElementById("rating_label").innerText = "Rating: ";
  document.getElementById("comment_label").innerText = "Comments: ";
  document.getElementById("submit_button").innerText = "Add Review";
  
  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.innerHTML = 'No reviews yet!';
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });
  container.appendChild(ul);
}

/**
 * Create new review form HTML and add it to the webpage.
 */
addReviewHTML = (id = self.restaurant.id) => {
	console.log("review for " + id);
  
  const review_form = document.createElement('div');
  review_form.setAttribute('id', 'new_review');
  
  const review_author = document.createElement('input');
  review_author.setAttribute('type', 'text');
  review_author.setAttribute('id', 'author');
  review_form.appendChild(review_author);
  
  const label_author = document.createElement('label');
  label_author.setAttribute('for', 'author');
  label_author.setAttribute('id', 'author_label');
  review_form.insertBefore(label_author, review_author);
   
  const rating = document.createElement('input');
  rating.setAttribute('type', 'range');
  rating.setAttribute('id', 'rating');
  rating.setAttribute('min', '1');
  rating.setAttribute('max', '5');
  review_form.appendChild(rating);
  
  const label_rating = document.createElement('label');
  label_rating.setAttribute('for', 'rating');
  label_rating.setAttribute('id', 'rating_label');
  review_form.insertBefore(label_rating, rating)
  
  const comments = document.createElement('textarea');
  comments.setAttribute('type', 'text');
  comments.setAttribute('id', 'comment');
  comments.setAttribute('rows', '5');
  comments.setAttribute('cold', '40');
  review_form.appendChild(comments);
  
  const label_comments = document.createElement('label');
  label_comments.setAttribute('for', 'comment');
  label_comments.setAttribute('id', 'comment_label');
  review_form.insertBefore(label_comments, comments);
  
  
  const submit_review = document.createElement('input');
  submit_review.setAttribute('type', 'button'); 
  submit_review.setAttribute('id', 'submit_button');
  submit_review.setAttribute('onclick', 'addReview(' + id +');');
  review_form.appendChild(submit_review);

  return review_form;
}

addReview = (id) => {
  const name = encodeURI(document.getElementById("author").value);
  const rating = document.getElementById("rating").value;
  const comment = encodeURI(document.getElementById("comment").value);
  
  if(name && comment){
	  const body = {
		  restaurant_id: id,
		  name: name,
		  rating: rating,
		  comments: comment
	  }
	  
	  DBHelper.addReview(body);
  }
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
  date.innerHTML = review.date;
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
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
