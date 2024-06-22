document.addEventListener('DOMContentLoaded', () => {
   const userIcon = document.querySelector('.user-icon');
   const popupCard1 = document.getElementById('popupCard1');
   const popupCard2 = document.getElementById('popupCard2');
   const blurBackground = document.createElement('div');
   blurBackground.classList.add('blur-background');

   userIcon.addEventListener('click', async () => {
      try {
         const response = await fetch('/api/user-profile');
         if (!response.ok) {
            throw new Error('Network response was not ok');
         }
         const data = await response.json();
         if (popupCard1.style.display === 'flex') {
            popupCard1.style.display = 'none';
            document.body.removeChild(blurBackground);
            return;
         }
         if (data.user) {
            const cardContent = popupCard1.querySelector('.card-content');
            cardContent.innerHTML = `
                  <div class="info-container">
                     <h4>User Information</h4>
                     <br>
                     <div class="info-item">
                        <span class="b">Name:</span>
                        <span>${data.user.name}</span>
                     </div>
                     <div class="info-item">
                        <span class="b">Email:</span>
                        <span>${data.user.email}</span>
                     </div>
                     <div class="info-item">
                        <span class="b">Address:</span>
                        <span>${data.user.address}</span>
                     </div>
                     <div class="info-item">
                        <span class="b">Age:</span>
                        <span>${data.user.age}</span>
                     </div>
                     <div class="info-item">
                        <span class="b">Contact:</span>
                        <span>${data.user.contact}</span>
                     </div>
                     <div class="button-container">
                        <button id="addInfoBtn" class="add-btn">Edit Info</button>
                        <button id="logoutBtn" class="login-btn">Logout</button>
                     </div>
                  </div>
               `;
            popupCard1.style.display = 'flex';

            const logoutBtn = document.getElementById('logoutBtn');
            logoutBtn.addEventListener('click', async () => {
               try {
                  const response = await fetch('/api/logout', {
                     method: 'POST',
                  });
                  if (response.ok) {
                     window.location.href = '/login';
                  } else {
                     throw new Error('Logout request failed');
                  }
               } catch (error) {
                  console.error('Error logging out:', error);
               }
            });

            const addInfoBtn = document.getElementById('addInfoBtn');
            addInfoBtn.addEventListener('click', () => {
               // Populate form fields with current user information
               document.getElementById('name').value = data.user.name;
               document.getElementById('email').value = data.user.email;
               document.getElementById('address').value = data.user.address;
               document.getElementById('age').value = data.user.age;
               document.getElementById('contact').value = data.user.contact;

               popupCard1.style.display = 'none';
               popupCard2.style.display = 'flex';
               document.body.appendChild(blurBackground);
            });
         } else {
            popupCard1.style.display = 'flex';
         }
      } catch (error) {
         console.error('Error fetching user profile:', error);
      }
   });

   const addInfoForm = document.getElementById('addInfoForm');
   addInfoForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(addInfoForm);
      const data = Object.fromEntries(formData.entries());
      try {
         const response = await fetch('/api/update-user-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
         });

         if (response.ok) {
            alert('Information updated successfully');
            popupCard2.style.display = 'none';
            document.body.removeChild(blurBackground);
         } else {
            throw new Error('Failed to update information');
         }
      } catch (error) {
         console.error('Error updating user info:', error);
      }
   });

   const cancelBtn = document.getElementById('cancelBtn');
   cancelBtn.addEventListener('click', () => {
      popupCard2.style.display = 'none';
      document.body.removeChild(blurBackground);
   });
});
