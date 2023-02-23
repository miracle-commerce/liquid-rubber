if (!customElements.get('product-form')) {
  customElements.define('product-form', class ProductForm extends HTMLElement {
    constructor() {
      super();

      this.form = this.querySelector('form');
      this.form.querySelector('[name=id]').disabled = false;
      this.form.addEventListener('submit', this.onSubmitHandler.bind(this));
      this.cartNotification = (window.innerWidth > 992) ? document.querySelector('.desktop-navigation cart-notification') : document.querySelector('.mobile-navigation cart-notification');
    }

    onSubmitHandler(evt) {
      evt.preventDefault();
      const submitButton = this.querySelector('[type="submit"]');
      if (submitButton.classList.contains('loading')) return;

      this.handleErrorMessage();
      this.cartNotification.setActiveElement(document.activeElement);

      submitButton.setAttribute('aria-disabled', true);
      submitButton.classList.add('loading');
      this.querySelector('.loading-overlay__spinner').classList.remove('hidden');

      const config = fetchConfig('javascript');
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
      delete config.headers['Content-Type'];

      const formData = new FormData(this.form);
      formData.append('sections', this.cartNotification.getSectionsToRender().map((section) => section.id));
      formData.append('sections_url', window.location.pathname);
      config.body = formData;

      fetch(`${routes.cart_add_url}`, config)
        .then((response) => response.json())
        .then((response) => {
          if (response.status) {
            this.handleErrorMessage(response.description);
            return;
          }

          utag.link({
            tealium_event: "cart_add",
            event_type: "add_to_cart",
            product_name: [response.product_title],
            product_id: [response.product_id.toString()],
            product_unit_price: [(response.original_price / 100).toFixed(2).toString()],
            item_category: this.dataset.productType ? this.dataset.productType : [], // product_type
            item_category2: this.dataset.project ? this.dataset.project : [], // project
            product_variant: [response.variant_title], // if applicable color or size
            product_quantity: [response.quantity.toString()]
          })

          this.cartNotification.renderContents(response);
          setTimeout(()=>{
            this.cartNotification.close()
          }, 5000)
        })
        .catch((e) => {
          console.error(e);
        })
        .finally(() => {
          submitButton.classList.remove('loading');
          submitButton.removeAttribute('aria-disabled');
          this.querySelector('.loading-overlay__spinner').classList.add('hidden');

          // Close Product and Project Recommended Products Modal
          if(document.querySelector('.c-modal#add-to-cart-modal')){
            let addToCart = document.querySelector('.c-modal#add-to-cart-modal'),
                modalContent = addToCart.querySelector('.modal-content')

            document.querySelector('body').classList.remove('modal-open')
            document.querySelector('body').style.removeProperty('margin-right')
            addToCart.querySelector('.modal').classList.remove('show')
            modalContent.setAttribute('aria-hidden', '')
            modalContent.removeAttribute('aria-selected', false)

            if(document.querySelector('.product') && document.querySelector('.product').querySelector('.modalClick')) {
              let productItem = document.querySelector('.product').querySelector('.modalClick')

              productItem.focus()
              productItem.classList.remove('modalClick')
            }
          }
        });
    }

    handleErrorMessage(errorMessage = false) {
      this.errorMessageWrapper = this.errorMessageWrapper || this.querySelector('.product-form__error-message-wrapper');
      this.errorMessage = this.errorMessage || this.errorMessageWrapper.querySelector('.product-form__error-message');

      this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

      if (errorMessage) {
        this.errorMessage.textContent = errorMessage;
      }
    }
  });
}
