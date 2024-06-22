document.addEventListener('DOMContentLoaded', () => {
   const menuList = document.getElementById('menuList');
   const cardList = document.getElementById('foodItems');
   const cartItemCount = document.querySelector('.cart-icon span');
   const cartItemList = document.querySelector('.cart-items');
   const cartTotal = document.querySelector('.cart-total');
   const cartIcon = document.querySelector('.cart-icon');
   const sidebar = document.getElementById('sidebar');
   const searchInput = document.getElementById('searchInput');
   const bowlIcon = document.querySelector('.bowl-icon');
   const favoritesSidebar = document.getElementById('sidebar1');
   const favoritesCountSpan = document.querySelector('.bowl-icon span');
   const favoritesItemsContainer = document.querySelector('.favorites-items');
   const checkout = document.getElementById('checkoutButton');

   let cartItems = [];
   let totalAmount = 0;
   let favoriteItemIds = [];

   async function displayCategoryItems(category) {
      const foodItems = document.querySelectorAll('.card');
      foodItems.forEach((item) => {
         const isFavorite = item.classList.contains('favorite');
         if (isFavorite || item.dataset.category === category) {
            item.style.display = 'block';
         } else {
            item.style.display = 'none';
         }
      });
   }

   async function addToFavorites(item) {
      try {
         console.log('Adding item to favorites:', item);

         if (favoriteItemIds.includes(item.id)) {
            console.log('Item is already in favorites:', item.id);
            return;
         }

         const response = await fetch('/api/Addtofavorites', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
            },
            body: JSON.stringify({ itemId: item.id }),
         });

         if (!response.ok) {
            throw new Error('Failed to add item to favorites');
         }

         const result = await response.json();
         console.log('Response from API:', result);

         favoriteItemIds.push(item.id);
         console.log('Favorite Item IDs:', favoriteItemIds);
         favoritesItemsContainer.innerHTML = ''; 
         await loadFavorites();
      } catch (error) {
         console.error('Error adding item to favorites:', error);
      }
   }

   fetch('/api/menu-items')
      .then((response) => response.json())
      .then((menuItemsData) => {
         menuItemsData.forEach((item) => {
            const menuItem = document.createElement('div');
            menuItem.classList.add('menu-item');
            menuItem.dataset.category = item.category;
            const img = document.createElement('img');
            img.src = item.img;
            menuItem.appendChild(img);
            const heading = document.createElement('h5');
            heading.textContent = item.category;
            menuItem.appendChild(heading);
            menuList.appendChild(menuItem);
            menuItem.addEventListener('click', () => {
               displayCategoryItems(item.category);
            });
         });
         displayCategoryItems('Main Dishes');
      })
      .catch((error) => console.error('Error fetching menu items:', error));

   async function shareOnFacebook(item) {
      const shareURL = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
         item.url
      )}`;
      window.open(shareURL, '_blank');
   }

   async function shareOnInstagram(item) {
      const shareURL = `https://www.instagram.com/share?url=${encodeURIComponent(
         item.url
      )}&title=${encodeURIComponent(
         item.title
      )}&description=${encodeURIComponent(item.description)}`;
      window.open(shareURL, '_blank');
   }
   async function shareOnTwitter(item) {
      const shareURL = `https://www.twitter.com/share?url=${encodeURIComponent(
         item.url
      )}&title=${encodeURIComponent(
         item.title
      )}&description=${encodeURIComponent(item.description)}`;
      window.open(shareURL, '_blank');
   }

   fetch('/api/food-items')
      .then((response) => response.json())
      .then((data) => {
         data.forEach((item) => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.dataset.category = item.category;

            const bookmarkIcon = document.createElement('i');
            bookmarkIcon.classList.add(
               'fa-solid',
               'fa-bookmark',
               'add-to-favorites'
            );
            bookmarkIcon.id = 'bookmark';
            card.appendChild(bookmarkIcon);

            const image = document.createElement('img');
            image.src = item.img;
            card.appendChild(image);

            const title = document.createElement('h4');
            title.classList.add('card-title');
            title.textContent = item.title;
            card.appendChild(title);

            const cardPrice = document.createElement('div');
            cardPrice.classList.add('card-price');

            const price = document.createElement('div');
            price.classList.add('price');
            price.textContent = `₱${item.price}`;
            cardPrice.appendChild(price);

            const addToCartButton = document.createElement('i');
            addToCartButton.classList.add('fa-solid', 'fa-plus', 'add-to-cart');
            cardPrice.appendChild(addToCartButton);

            card.appendChild(cardPrice);

            cardList.appendChild(card);

            addToCartButton.addEventListener('click', () => {
               addItemToCart(item);
            });

            bookmarkIcon.addEventListener('click', function () {
               addToFavorites(item);
            });

            const shareIconsContainer = document.createElement('div');
            shareIconsContainer.classList.add('share-icons');

            const facebookIcon = document.createElement('i');
            facebookIcon.classList.add('fab', 'fa-facebook', 'share-icon');
            facebookIcon.style.color = '#1877F2';
            facebookIcon.addEventListener('click', () => shareOnFacebook(item));
            shareIconsContainer.appendChild(facebookIcon);

            const instagramIcon = document.createElement('i');
            instagramIcon.classList.add('fab', 'fa-instagram', 'share-icon');
            instagramIcon.style.color = '#C13584';
            instagramIcon.addEventListener('click', () =>
               shareOnInstagram(item)
            );
            shareIconsContainer.appendChild(instagramIcon);

            const twitterIcon = document.createElement('i');
            twitterIcon.classList.add('fab', 'fa-twitter', 'share-icon');
            twitterIcon.style.color = '#1DA1F2';
            twitterIcon.addEventListener('click', () => shareOnTwitter(item));
            shareIconsContainer.appendChild(twitterIcon);

            card.appendChild(shareIconsContainer);
         });

         displayCategoryItems('Main Dishes');
      })
      .catch((error) => console.error('Error fetching food items:', error));

   menuList.addEventListener('click', (event) => {
      if (event.target.classList.contains('menu-item')) {
         const category = event.target.textContent;
         displayCategoryItems(category);
      }
   });

   async function addItemToCart(item) {
      const existingItem = cartItems.find(
         (cartItem) => cartItem.id === item.id
      );

      let quantity;
      if (existingItem) {
         existingItem.quantity++;
         quantity = existingItem.quantity;
      } else {
         quantity = 1;
         cartItems.push({ ...item, quantity: 1 });
      }
      totalAmount += parseFloat(item.price.replace('₱', ''));
      updateCartUI();

      try {
         const requestBody = JSON.stringify({
            itemId: item.id,
            quantity: quantity,
         });

         const response = await fetch('/api/Addtocart', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
            },
            body: requestBody,
         });

         const contentType = response.headers.get('content-type');
         let responseData;

         if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
         } else {
            responseData = await response.text();
         }

         console.log('Response:', responseData);
         await updateCartTotalInDatabase();
      } catch (error) {
         console.error('Error adding item to cart:', error);
      }
   }

   async function subtractQuantity() {
      const itemIndex = parseInt(this.dataset.index);
      const selectedItem = cartItems[itemIndex];
      if (selectedItem.quantity > 1) {
         selectedItem.quantity--;
         totalAmount -= parseFloat(selectedItem.price.replace('₱', ''));
         updateCartUI();
         await updateCartItemQuantity(selectedItem.id, selectedItem.quantity);
      }
   }

   async function addQuantity() {
      const itemIndex = parseInt(this.dataset.index);
      const selectedItem = cartItems[itemIndex];
      selectedItem.quantity++;
      totalAmount += parseFloat(selectedItem.price.replace('₱', ''));
      updateCartUI();
      await updateCartItemQuantity(selectedItem.id, selectedItem.quantity);
   }

   async function updateCartItemQuantity(itemId, quantity) {
      try {
         const requestBody = JSON.stringify({
            itemId: itemId,
            quantity: quantity,
         });

         const response = await fetch('/api/Updatecartquantity', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
            },
            body: requestBody,
         });

         const contentType = response.headers.get('content-type');
         let responseData;

         if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
         } else {
            responseData = await response.text();
         }

         console.log('Update Quantity Response:', responseData);
      } catch (error) {
         console.error('Error updating cart item quantity:', error);
      }
   }

   async function removeItemFromCart(cartItemId) {
      console.log('Remove Item', cartItemId);

      if (!cartItemId) {
         console.error('Cart item ID is null or undefined');
         return;
      }

      try {
         const response = await fetch('/api/Removecart', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
            },
            body: JSON.stringify({ cartItemId }),
         });

         const contentType = response.headers.get('content-type');
         let responseData;

         if (contentType && contentType.includes('application/json')) {
            responseData = await response.json();
         } else {
            responseData = await response.text();
         }

         console.log('Remove Item Response:', responseData);

         if (response.ok) {
            const removedItemIndex = cartItems.findIndex(
               (item) => item.id === cartItemId
            );
            if (removedItemIndex !== -1) {
               cartItems.splice(removedItemIndex, 1);
               updateCartUI();
            }
            totalAmount = cartItems.reduce(
               (total, item) =>
                  total + item.price.replace('₱', '') * item.quantity,
               0
            );
            cartTotal.textContent = `₱${totalAmount.toFixed(2)}`;
         } else {
            console.error('Error removing item from cart:', responseData);
         }
      } catch (error) {
         console.error('Error removing item from cart:', error);
      }
   }

   function updateCartUI() {
      cartItemCount.textContent = cartItems.length;
      cartItemList.innerHTML = '';
      cartItems.forEach((item, index) => {
         const cartItem = document.createElement('div');
         cartItem.classList.add('cart-item');

         const itemImage = document.createElement('img');
         itemImage.src = item.img;
         cartItem.appendChild(itemImage);

         const itemName = document.createElement('span');
         itemName.textContent = item.title;
         cartItem.appendChild(itemName);

         const quantityControls = document.createElement('div');
         quantityControls.classList.add('quantity-controls');

         const subtractButton = document.createElement('button');
         subtractButton.textContent = '-';
         subtractButton.classList.add('quantity-btn');
         subtractButton.dataset.action = 'subtract';
         subtractButton.dataset.index = index;
         quantityControls.appendChild(subtractButton);

         const quantityDisplay = document.createElement('span');
         quantityDisplay.textContent = item.quantity;
         quantityControls.appendChild(quantityDisplay);

         const addButton = document.createElement('button');
         addButton.textContent = '+';
         addButton.classList.add('quantity-btn');
         addButton.dataset.action = 'add';
         addButton.dataset.index = index;
         quantityControls.appendChild(addButton);
         cartItem.appendChild(quantityControls);

         const itemPrice = document.createElement('span');
         itemPrice.classList.add('cart-item-price');
         itemPrice.textContent = `₱${
            item.price.replace('₱', '') * item.quantity
         }`;
         cartItem.appendChild(itemPrice);

         const removeButton = document.createElement('button');
         removeButton.classList.add('remove-btn');
         removeButton.textContent = 'x';
         removeButton.dataset.index = index;
         cartItem.appendChild(removeButton);

         removeButton.addEventListener('click', () => {
            removeItemFromCart(item.id);
         });

         subtractButton.addEventListener('click', subtractQuantity);
         addButton.addEventListener('click', addQuantity);

         cartItemList.appendChild(cartItem);
      });

      totalAmount = cartItems.reduce(
         (total, item) => total + item.price.replace('₱', '') * item.quantity,
         0
      );
      cartTotal.textContent = `₱${totalAmount.toFixed(2)}`;

      console.log('Cart updated:', cartItems);
   }

   async function loadCart() {
      try {
         const response = await fetch('/api/cart');
         if (!response.ok) {
            throw new Error('Network response was not ok');
         }
         const data = await response.json();
         cartItems = data.map((item) => ({
            id: item.item_id,
            title: item.title,
            price: `₱${item.price}`,
            img: item.img,
            quantity: item.quantity,
         }));
         totalAmount = cartItems.reduce(
            (total, item) =>
               total + parseFloat(item.price.replace('₱', '')) * item.quantity,
            0
         );
         console.log('Cart Items:', cartItems);
         console.log('Total Amount:', totalAmount);
         updateCartUI();
      } catch (error) {
         console.error('Error loading cart:', error);
      }
   }

   async function loadFavorites() {
      try {
         const response = await fetch('/api/favorites');
         if (!response.ok) {
            throw new Error('Failed to load favorites');
         }
         const favorites = await response.json();
         favoritesItemsContainer.innerHTML = '';
         favorites.forEach((favorite) => {
            const favoriteItem = document.createElement('div');
            favoriteItem.classList.add('card', 'favorite'); // Add 'favorite' class
            favoriteItem.dataset.itemId = favorite.id;
            const image = document.createElement('img');
            image.src = favorite.img;
            favoriteItem.appendChild(image);
            const title = document.createElement('h4');
            title.classList.add('card-title');
            title.textContent = favorite.title;
            favoriteItem.appendChild(title);
            const cardPrice = document.createElement('div');
            cardPrice.classList.add('card-price');
            const price = document.createElement('div');
            price.classList.add('price');
            price.textContent = `₱${favorite.price}`;
            cardPrice.appendChild(price);
            const removeFromFavoritesButton = document.createElement('button');
            removeFromFavoritesButton.classList.add('remove-from-favorites');
            removeFromFavoritesButton.textContent = 'x';
            favoriteItem.appendChild(removeFromFavoritesButton);

            favoritesItemsContainer.appendChild(favoriteItem);

            removeFromFavoritesButton.addEventListener('click', async () => {
               try {
                  const removeResponse = await fetch('/api/Removefavorite', {
                     method: 'POST',
                     headers: {
                        'Content-Type': 'application/json',
                     },
                     body: JSON.stringify({ favoriteId: favorite.id }),
                  });

                  if (!removeResponse.ok) {
                     throw new Error('Failed to remove item from favorites');
                  }

                  const removeResult = await removeResponse.json();
                  favoriteItem.remove();
                  favoritesCountSpan.textContent =
                     parseInt(favoritesCountSpan.textContent) - 1;
               } catch (error) {
                  console.error('Error removing item from favorites:', error);
               }
            });
         });

         favoritesCountSpan.textContent = favorites.length;
      } catch (error) {
         console.error('Error loading favorites:', error);
      }
   }

   async function updateCartTotalInDatabase() {
      try {
         const requestBody = JSON.stringify({
            cartTotal: totalAmount.toFixed(2),
         });

         const response = await fetch('/api/update-cart-total', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/json',
            },
            body: requestBody,
         });

         if (!response.ok) {
            throw new Error('Failed to update cart total in the database');
         }

         console.log('Cart total updated in the database');
      } catch (error) {
         console.error('Error updating cart total in the database:', error);
      }
   }

   cartIcon.addEventListener('click', () => {
      sidebar.classList.toggle('open');
   });

   bowlIcon.addEventListener('click', () => {
      favoritesSidebar.classList.toggle('open');
   });

   document.querySelector('.sidebar-close').addEventListener('click', () => {
      sidebar.classList.remove('open');
   });

   document.querySelector('.sidebar-close1').addEventListener('click', () => {
      favoritesSidebar.classList.remove('open');
   });

   searchInput.addEventListener('input', () => {
      const filter = searchInput.value.toLowerCase();
      const foodItems = document.querySelectorAll('.card');
      foodItems.forEach((item) => {
         const title = item
            .querySelector('.card-title')
            .textContent.toLowerCase();
         const category = item.dataset.category.toLowerCase();
         if (filter.trim() === '') {
            item.style.display = category === 'main dishes' ? 'block' : 'none';
         } else {
            item.style.display = title.includes(filter) ? 'block' : 'none';
         }
      });
   });

   loadCart();
   loadFavorites();

   checkout.addEventListener('click', () => {
      window.location.href = '../pages/checkout.html';
   });
});