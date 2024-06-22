function showSignupForm() {
   document.getElementById('loginForm').classList.add('hidden');
   document.getElementById('signupForm').classList.remove('hidden');
}

function showLoginForm() {
   document.getElementById('signupForm').classList.add('hidden');
   document.getElementById('loginForm').classList.remove('hidden');
}
