class CartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', (event) => {
      event.preventDefault();
      this.closest('cart-items').updateQuantity(this.dataset.index, 0);
    });
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();

    this.lineItemStatusElement = document.getElementById('shopping-cart-line-item-status');

    this.currentItemCount = Array.from(this.querySelectorAll('[name="updates[]"]'))
        .reduce((total, quantityInput) => total + parseInt(quantityInput.value), 0);

    this.previousQuantities = Array.from(this.querySelectorAll('[name="updates[]"]'), (el, i) => el.value)

    this.debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, 300);

    this.addEventListener('change', this.debouncedOnChange.bind(this));
  }

  onChange(event) {
    this.updateQuantity(event.target.dataset.index, event.target.value, document.activeElement.getAttribute('name'));
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section'
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section'
      },
      {
        id: 'main-cart-items',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-cart-contents',
      },
      {
        id: 'main-cart-items-checkout',
        section: document.getElementById('main-cart-items').dataset.id,
        selector: '.js-checkout-contents',
      }
    ];
  }

  updateQuantity(line, quantity, name) {
    this.enableLoading(line);

    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname
    }), responsive = (window.innerWidth > 992) ? 'desktop' : 'mobile'

    fetch(`${routes.cart_change_url}`, {...fetchConfig(), ...{ body }})
        .then((response) => {
          return response.text();
        })
        .then((state) => {
          const parsedState = JSON.parse(state);
          this.classList.toggle('is-empty', parsedState.item_count === 0);
          const cartContainer = document.querySelector('.c-cart')
          if (cartContainer) cartContainer.classList.toggle('is-empty', parsedState.item_count === 0);
          const utagProduct = parsedState.items[line - 1] ? parsedState.items[line - 1] : null,
              product = this.querySelector('#CartItem-' + line),
              item_category = product.dataset.productType ? product.dataset.productType : '',
              item_category2 = product.dataset.project ? product.dataset.project : '',
              cartCoupons = parsedState.cart_level_discount_applications,
              order_coupon_code = [],
              order_discount = []

          let tealium_event,
              event_type,
              product_name,
              product_id,
              product_unit_price,
              product_variant,
              product_quantity,
              product_promotion_name,
              product_discount,
              previousQuantity = this.previousQuantities[line - 1],
              updatedQuantity

          for(let i = 0; i < cartCoupons.length; i++) {
            order_discount.push((cartCoupons[i].total_allocated_amount / 100).toFixed(2).toString())
            order_coupon_code.push(cartCoupons[i].title)
          }

          if(quantity.toString() === '0') {
                this.previousQuantities.splice(line - 1, 1) // remove from previous quantities

                tealium_event = "cart_remove"
                event_type = "remove_from_cart"
                product_name = product.querySelector('.cart-item__name') ? [product.querySelector('.cart-item__name').textContent] : []
                product_id = product.dataset.id ? [product.dataset.id] : []
                product_unit_price = product.querySelector('.price--end') ? [product.querySelector('.price--end').textContent.replace('$', '').trim()] : ''
                product_variant = product.dataset.variantTitle ? [product.dataset.variantTitle] : []
                product_quantity = [quantity.toString()]
                product_promotion_name = product.dataset.discounts ? product.dataset.discounts : []
                product_discount = product.dataset.discountPrices ? product.dataset.discountPrices : []
          } else {
            if(utagProduct) {
                  this.previousQuantities[line - 1] = quantity

                  updatedQuantity =quantity - previousQuantity
                  tealium_event = (updatedQuantity > 0 ? "cart_add" : "cart_remove")
                  event_type = (updatedQuantity > 0 ? "add_to_cart" : "remove_from_cart")
                  product_name = [utagProduct.product_title]
                  product_id = [utagProduct.product_id.toString()]
                  product_unit_price = [(utagProduct.original_price / 100).toFixed(2).toString()]
                  product_variant = [utagProduct.variant_title] // if applicable color or size
                  product_quantity = [Math.abs(updatedQuantity).toString()]
                  product_promotion_name = [],
                  product_discount = []

              let productCoupons = utagProduct.discounts

              for(let i = 0; i < productCoupons.length; i++) {
                product_promotion_name.push(productCoupons[i].title)
                product_discount.push((productCoupons[i].amount / 100).toFixed(2).toString())
              }
            }
          }

          utag.link({
            tealium_event: tealium_event,
            event_type: event_type,
            order_coupon_code: order_coupon_code,
            order_discount: order_discount,
            product_name: product_name,
            product_id: product_id,
            product_unit_price: product_unit_price,
            item_category: item_category, // product_type
            item_category2: item_category2, // project
            product_variant: product_variant, // if applicable color or size
            product_quantity: product_quantity,
            product_promotion_name: product_promotion_name,
            product_discount: product_discount
          })

          this.getSectionsToRender().forEach((section => {
            const elementToReplace = document.getElementById((section.id === 'cart-icon-bubble' ? responsive + '-' : '') + section.id).querySelector(section.selector) || document.getElementById((section.id === 'cart-icon-bubble' ? responsive + '-' : '') + section.id);

            // add to mobile menu drawer
            if(responsive === 'mobile' && section.id === 'cart-icon-bubble'){
              document.getElementById(responsive + '-inner-' + section.id).innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector) + (section.id === 'cart-notification-button' ? '<span class="arrow"></span>' : '');
            }

            elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
          }));

          // Remove class to make full width when removing all items
          const cartItemsContainer = document.querySelector('.c-cart-items')
          if (cartItemsContainer && parsedState.item_count === 0) cartItemsContainer.classList.remove("col-lg-7", "col-xl-8");

          this.updateLiveRegions(line, parsedState.item_count);
          const lineItem =  document.getElementById(`CartItem-${line}`);
          if (lineItem && lineItem.querySelector(`[name="${name}"]`)) lineItem.querySelector(`[name="${name}"]`).focus();
          this.disableLoading();
        }).catch(() => {
      this.querySelectorAll('.loading-overlay').forEach((overlay) => overlay.classList.add('hidden'));
      document.getElementById('cart-errors').textContent = window.cartStrings.error;
      this.disableLoading();
    });
  }

  updateLiveRegions(line, itemCount) {
    if (this.currentItemCount === itemCount) {
      document.getElementById(`Line-item-error-${line}`)
          .querySelector('.cart-item__error-text')
          .innerHTML = window.cartStrings.quantityError.replace(
          '[quantity]',
          document.getElementById(`Quantity-${line}`).value
      );
    }

    this.currentItemCount = itemCount;
    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus = document.getElementById('cart-live-region-text');
    cartStatus.setAttribute('aria-hidden', false);

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }

  getSectionInnerHTML(html, selector) {
    const dom =  new DOMParser().parseFromString(html, 'text/html')
    if(!dom.querySelector(selector)) return
    return dom.querySelector(selector).innerHTML
  }

  enableLoading(line) {
    document.getElementById('main-cart-items').classList.add('cart__items--disabled');
    this.querySelectorAll(`#CartItem-${line} .loading-overlay`).forEach((overlay) => overlay.classList.remove('hidden'));
    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }

  disableLoading() {
    document.getElementById('main-cart-items').classList.remove('cart__items--disabled');
  }
}

customElements.define('cart-items', CartItems);
