const modal = document.getElementById("add-item-modal");
const addItemBtn = document.getElementById("add-item-btn");
const closeModal = document.getElementById("close-modal");

addItemBtn.onclick = function() {
    modal.style.display = "flex";
}

closeModal.onclick = function() {
    modal.style.display = "none";
}

window.onclick = function(event) {
    if (event.target == modal) {
        modal.style.display = "none";
    }
}