// Case Stories Lightbox Modal
// Handles image galleries for each case with navigation

// Define all case image collections
const caseGalleries = {
    norman: [
        { src: 'images/Norman/norman.jpeg', caption: 'Norman - Pre-operative Assessment' },
        { src: 'images/Norman/normanlateral.jpeg', caption: 'Norman - Lateral Radiograph' },
        { src: 'images/Norman/normancrcd.jpeg', caption: 'Norman - CrCd Rupture Diagnosis' },
        { src: 'images/Norman/normanpostop.jpeg', caption: 'Norman - Post-operative Recovery Day 1' },
        { src: 'images/Norman/normanpostop2.jpeg', caption: 'Norman - Post-operative Recovery Day 7' }
    ],
    ruby: [
        { src: 'images/Ruby/ruby.jpeg', caption: 'Ruby - Soft Tissue Reconstruction Case' }
    ],
    kuba: [
        { src: 'images/Kuba/kubaop1.jpg', caption: 'Kuba - Fracture Repair Procedure' },
        { src: 'images/Kuba/kubaop2.jpg', caption: 'Kuba - Post-operative Radiograph' }
    ],
    mct: [
        { src: 'images/MCT-APF/MCT-APF1.jpeg', caption: 'MCT Mass - Initial Presentation' },
        { src: 'images/MCT-APF/MCTpostop1.jpeg', caption: 'MCT Mass - Post-operative Site' },
        { src: 'images/MCT-APF/MCTrecheck.jpeg', caption: 'MCT Mass - Follow-up Recheck' }
    ],
    skewerdog: [
        { src: 'images/SkewerDog/skewerdog.jpeg', caption: 'Foreign Body Removal - Emergency Case' }
    ]
};

// Modal state
let currentCase = null;
let currentImageIndex = 0;

// DOM elements
const modal = document.getElementById('caseModal');
const modalImage = document.getElementById('modalImage');
const modalCaption = document.getElementById('modalCaption');
const modalCounter = document.getElementById('modalCounter');
const closeBtn = document.querySelector('.modal-close');
const prevBtn = document.querySelector('.modal-prev');
const nextBtn = document.querySelector('.modal-next');
const galleryItems = document.querySelectorAll('.gallery-item');

// Open modal when gallery item is clicked
galleryItems.forEach(item => {
    item.addEventListener('click', function() {
        const caseName = this.getAttribute('data-case');
        openModal(caseName, 0);
    });
    
    // Add pointer cursor to indicate clickable
    item.style.cursor = 'pointer';
});

// Open modal function
function openModal(caseName, imageIndex = 0) {
    currentCase = caseName;
    currentImageIndex = imageIndex;
    
    const gallery = caseGalleries[caseName];
    if (!gallery || gallery.length === 0) return;
    
    showImage();
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

// Close modal function
function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = ''; // Restore scrolling
    currentCase = null;
    currentImageIndex = 0;
}

// Show current image
function showImage() {
    const gallery = caseGalleries[currentCase];
    if (!gallery) return;
    
    const imageData = gallery[currentImageIndex];
    modalImage.src = imageData.src;
    modalImage.alt = imageData.caption;
    modalCaption.textContent = imageData.caption;
    modalCounter.textContent = `${currentImageIndex + 1} / ${gallery.length}`;
    
    // Show/hide navigation buttons based on gallery size
    if (gallery.length === 1) {
        prevBtn.style.display = 'none';
        nextBtn.style.display = 'none';
    } else {
        prevBtn.style.display = 'flex';
        nextBtn.style.display = 'flex';
    }
}

// Navigate to previous image
function showPreviousImage() {
    const gallery = caseGalleries[currentCase];
    if (!gallery) return;
    
    currentImageIndex = (currentImageIndex - 1 + gallery.length) % gallery.length;
    showImage();
}

// Navigate to next image
function showNextImage() {
    const gallery = caseGalleries[currentCase];
    if (!gallery) return;
    
    currentImageIndex = (currentImageIndex + 1) % gallery.length;
    showImage();
}

// Event listeners
closeBtn.addEventListener('click', closeModal);
prevBtn.addEventListener('click', showPreviousImage);
nextBtn.addEventListener('click', showNextImage);

// Close modal when clicking outside the image
modal.addEventListener('click', function(e) {
    if (e.target === modal) {
        closeModal();
    }
});

// Keyboard navigation
document.addEventListener('keydown', function(e) {
    if (modal.style.display !== 'flex') return;
    
    switch(e.key) {
        case 'Escape':
            closeModal();
            break;
        case 'ArrowLeft':
            showPreviousImage();
            break;
        case 'ArrowRight':
            showNextImage();
            break;
    }
});

// Prevent modal content from closing when clicked
document.querySelector('.modal-content').addEventListener('click', function(e) {
    e.stopPropagation();
});

