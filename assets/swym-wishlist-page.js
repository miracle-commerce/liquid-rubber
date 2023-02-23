// dynamic project data markup

var productCardMarkup = `
    {{#products}}
        <div class="col-12 col-sm-6 col-lg-4 product-card" data-project-id="{{empi}}">
            <div class="image-container">
                <img class="lazyautosizes" src="{{iu}}" />
            </div>
            <div class="project-title">
                <span class="grid-view-item__title product-card__title" aria-hidden="true">{{dt}}</span>
                <button data-with-epi="true" class="swym-button swym-add-to-wishlist-view-product product_{{epi}}" data-swaction="addToWishlist" data-product-id="{{epi}}" data-variant-id="{{product.variants[0].id}}" data-product-url="{{ shop.url }}{{du}}"></button>
                <button class="custom-swym-button swym-add-to-wishlist-view-product swym-heart product_{{epi}}" data-swaction="addToWishlist" data-product-id="{{epi}}"></button>
            </div>
            <div class="project-information">
                
            </div>
            <div class="project-button">
              <a class="button orange hollow" href="{{du}}" aria-label="View Project">View Project<span class="arrow"></span></a>
            </div>
        </div>
    {{/products}}
`;

function getVariantInfo(variants){
  try {
    let variantKeys = ((variants && variants != "[]") ? Object.keys(JSON.parse(variants)[0]) : []) , variantinfo;
    if(variantKeys.length > 0){
      variantinfo = variantKeys[0];
      if(variantinfo == "Default Title"){
        variantinfo = "";
      }
    } else {
      variantinfo = "";
    }
    return variantinfo;
  } catch(err){
    return variants;
  }
}

function swymCallbackFn(){
  // gets called once Swym is ready
  var wishlistContentsContainer = document.getElementById("wishlist-items-container");
  _swat.fetchWrtEventTypeET(
    function(products) {
      // Get wishlist items
      var formattedWishlistedProducts = products.map(function(p){
        return p;
      });
      
      var productCardsMarkup = SwymUtils.renderTemplateString(productCardMarkup, {products: formattedWishlistedProducts});
      wishlistContentsContainer.innerHTML = productCardsMarkup;
      

      // adds click event
      attachClickListeners();

      // check if my project list is empty
      checkEmpty();

      // get project info
      getProjectInformation()
      
    },
    window._swat.EventTypes.addToWishList
  );
}
if(!window.SwymCallbacks){
  window.SwymCallbacks = [];
}

window.SwymCallbacks.push(swymCallbackFn);

function removeFromWishlist(e){
    var productId = e.target.getAttribute("data-product-id");
    window._swat.removeFromWishList(
        {epi: productId},
        function() {
            e.target.closest('.product-card').remove();
            checkEmpty()
        }
    );
}

function getProjectInformation(){
    

  // collects data passed from projects
    $.each(projects, (k, v)=> {
        let t = '',
            d = '',
            p = ''
        

        // creates markup for individual categories
        if (v['products'] != '0') {
            p += '<div class="project-info project-products">'
            p += '<div class="icon-container">'
            p += '<img src="'+ v['products_icon'] +'"/>'
            p += '</div>'
            p += '<span class="category">'+ v['products_title'] +':</span>'
            p += '<span class="info">' + v['products_needed'] + '</span>'
            p += '</div>'

            $('[data-project-id="' + k + '"] .project-information').prepend(p)
        }
        if (v['difficulty'] != '0') {
            d += '<div class="project-info project-difficulty">'
            d += '<div class="icon-container">'
            d += '<img src="'+ v['difficulty_icon'] +'"/>'
            d += '</div>'
            d += '<span class="category">'+ v['difficulty_title'] +':</span>'
            d += '<span class="info">' + v['difficulty'] + '</span>'
            d += '</div>'

            $('[data-project-id="' + k + '"] .project-information').prepend(d)
        }
        if (v['time_to_complete'] != '0') {
            t += '<div class="project-info project-time">'
            t += '<div class="icon-container">'
            t += '<img src="'+ v['time_icon'] +'"/>'
            t += '</div>'
            t += '<span class="category">'+ v['time_title'] +':</span>'
            t += '<span class="info">' + v['time_to_complete'] + '</span>'
            t += '</div>'

            $('[data-project-id="' + k + '"] .project-information').prepend(t)
        }
        

    })
}

function checkEmpty() {
    if ($('.product-card').length == 0) {
        $('.c-no-items').removeClass('d-none')
        $('.c-suggested-projects').removeClass('d-none')
        $('.c-rewards').addClass('d-none')
    }
}
  
  
function attachClickListeners(){
    var saveButtons = document.getElementsByClassName("custom-swym-button");
    for (var i = 0; i < saveButtons.length; i++) {
        saveButtons[i].addEventListener('click', removeFromWishlist, false);
    }
}