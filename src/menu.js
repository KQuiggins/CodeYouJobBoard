document.addEventListener("DOMContentLoaded", () => {
  const burgerBtn = document.querySelector(".hamburger");

  burgerBtn.addEventListener("click", () => {
    const burgerIcon = document.querySelector(".hamburger i");
    const menu = document.querySelector("aside");
    const body = document.querySelector("body");

    burgerIcon.classList.toggle("fa-bars");
    burgerIcon.classList.toggle("fa-x");
    menu.classList.toggle("active");
    body.classList.toggle("no-scroll");
  });
});
