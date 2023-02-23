class CartNotification extends HTMLElement {
  constructor() {
    super();

    this.notification = (window.innerWidth > 992) ? document.getElementById('desktop-cart-notification') : document.getElementById('mobile-cart-notification');
    this.header = document.querySelector('sticky-header');
    this.onBodyClick = this.handleBodyClick.bind(this);

    this.currentItemCount = Array.from(this.querySelectorAll('[name="updates[]"]'))
        .reduce((total, quantityInput) => total + parseInt(quantityInput.value), 0);

    this.debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, 300);

    this.addEventListener('change', this.debouncedOnChange.bind(this));

    this.notification.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
  }

  open() {
    this.notification.classList.add('animate', 'active');

    this.notification.addEventListener('transitionend', () => {
      this.notification.focus();
      trapFocus(this.notification);
    }, { once: true });

    document.body.addEventListener('click', this.onBodyClick);
  }

  close() {
    this.notification.classList.remove('active');

    document.body.removeEventListener('click', this.onBodyClick);

    removeTrapFocus(this.activeElement);
  }

  renderContents(parsedState) {
    let responsive = (window.innerWidth > 992) ? 'desktop' : 'mobile'

    this.getSectionsToRender().forEach((section => {
      document.getElementById(responsive + '-' + section.id).innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector) + (section.id === 'cart-notification-button' ? '<span class="arrow"></span>' : '');

      // add to mobile menu drawer
      if(responsive === 'mobile' && section.id === 'cart-icon-bubble'){
        document.getElementById(responsive + '-inner-' + section.id).innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector) + (section.id === 'cart-notification-button' ? '<span class="arrow"></span>' : '');
      }
    }));

    if (this.header) this.header.reveal();

    // used when called from the product page to remove class to show right contents
    this.classList.toggle('is-empty', parsedState.item_count === 0);
    this.open();
  }

  getSectionsToRender() {
    return  [
      {
        id: 'cart-notification-product'
      },
      {
        id: 'cart-notification-button'
      },
      {
        id: 'cart-icon-bubble'
      }
    ];
  }

  onChange(event) {
    this.updateQuantity(event.target.dataset.index, event.target.value, document.activeElement.getAttribute('name'));
  }

  updateQuantity(line, quantity, name) {
    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.id),
      sections_url: window.location.pathname
    }), responsive = (window.innerWidth > 992) ? 'desktop' : 'mobile'

    fetch(`${routes.cart_change_url}`, {...fetchConfig(), ...{ body }})
        .then((response) => {
          return response.text();
        })
        .then((state) => {
          const parsedState = JSON.parse(state)

          parsedState.item_count === 0 ? this.classList.add('is-empty') : this.classList.remove('is-empty')
          if(parsedState.item_count === 0) {
            this.close()
          }

          this.getSectionsToRender().forEach((section => {
            const elementToReplace =
                document.getElementById(responsive + '-' + section.id).querySelector(section.selector) || document.getElementById(responsive + '-' + section.id);

            // add to mobile menu drawer
            if(responsive === 'mobile' && section.id === 'cart-icon-bubble'){
              document.getElementById(responsive + '-inner-' + section.id).innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector) + (section.id === 'cart-notification-button' ? '<span class="arrow"></span>' : '');
            }

            elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.id], section.selector) + (section.id === 'cart-notification-button' ? '<span class="arrow"></span>' : '');
          }));

          this.updateLiveRegions(line, parsedState.item_count);
          const lineItem =  document.getElementById(`CartItem-${line}`);
          if (lineItem && lineItem.querySelector(`[name="${name}"]`)) lineItem.querySelector(`[name="${name}"]`).focus();

          const utagNotificationProduct = parsedState.items[line - 1],
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
              product_discount

          for(let i = 0; i < cartCoupons.length; i++) {
            order_coupon_code.push(cartCoupons[i].title)
            order_discount.push((cartCoupons[i].total_allocated_amount / 100).toFixed(2).toString())
          }

          if(quantity.toString() === '0') {
            tealium_event = "cart_remove"
            event_type = "remove_from_cart"
            product_name = product.querySelector('.cart-notification-product__name') ? [product.querySelector('.cart-notification-product__name').textContent] : []
            product_id = product.dataset.id ? [product.dataset.id] : []
            product_unit_price =  product.dataset.price ? [product.dataset.price] : []
            product_variant = product.dataset.variantTitle ? [product.dataset.variantTitle] : []
            product_quantity = [quantity.toString()]
            product_promotion_name = product.dataset.discounts ? product.dataset.discounts : []
            product_discount = product.dataset.discountPrices ? product.dataset.discountPrices : []
          } else {
            if(utagNotificationProduct) {
              tealium_event = "cart_add"
              event_type = "add_to_cart"
              product_name = [utagNotificationProduct.product_title]
              product_id = [utagNotificationProduct.product_id.toString()]
              product_unit_price = [(utagNotificationProduct.original_price / 100).toFixed(2).toString()]
              product_variant = [utagNotificationProduct.variant_title] // if applicable color or size
              product_quantity = [utagNotificationProduct.quantity.toString()]
              product_promotion_name = [],
                  product_discount = []

              let productCoupons = utagNotificationProduct.discounts

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
        }).catch(() => {});
  }

  updateLiveRegions(line, itemCount) {
    this.currentItemCount = itemCount;
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser()
        .parseFromString(html, 'text/html')
        .querySelector(selector).innerHTML;
  }

  handleBodyClick(evt) {
    const target = evt.target;
    if (target !== this.notification && !target.closest('cart-notification')) {
      const disclosure = target.closest('details-disclosure');
      this.activeElement = disclosure ? disclosure.querySelector('summary') : null;
      this.close();
    }
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-notification', CartNotification);
