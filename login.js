const roleButtons = document.querySelectorAll(".role-button");
const passwordInput = document.querySelector("#password");
const visibilityToggle = document.querySelector(".visibility-toggle");

roleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    roleButtons.forEach((candidate) => {
      const selected = candidate === button;
      candidate.classList.toggle("is-active", selected);
      candidate.setAttribute("aria-pressed", String(selected));
    });
  });
});

visibilityToggle.addEventListener("click", () => {
  const showing = passwordInput.type === "text";
  passwordInput.type = showing ? "password" : "text";
  visibilityToggle.setAttribute("aria-label", showing ? "Show password" : "Hide password");
});
