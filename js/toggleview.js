/*
  open/hide restaurant listing/details
*/

addRemoveList = () => {
  var menu_div = document.getElementById('menu_div');
  var menu = document.getElementById('menu');
  var list = document.getElementsByClassName('box_resaurants');
  var detail = document.getElementById('main_container');
  var mapdiv = document.getElementById('map_div');
  var filterdiv = document.getElementById('filter_div');

  slide = (list.length > 0)? list[0]: detail;
  
  if (menu_div.style.display == "none") {
        slide.classList.remove("open");
        mapdiv.style.display = "block";
        if(filterdiv){
          filterdiv.style.display = "block";
        }
      }else{
        menu.addEventListener('click', function(e) {
          e.stopPropagation();
          slide.classList.toggle('open');
          mapdiv.style.display = (mapdiv.style.display === 'none')? "block":"none";
          if(filterdiv){
            filterdiv.style.display = (filterdiv.style.display === 'none')? "block":"none";
          }
          
          setTimeout(function(){
            if(slide.classList.contains("open")){
              var links = document.getElementsByTagName("a");
              var link;

              for (var i = 0; i < links.length; i++) {
                if (links[i].textContent == "View Details") {
                  links[i].tabIndex = "0";
                  links[i].focus();
                  break;
                }
              }
            }
          }, 300);
        });
      } 
}