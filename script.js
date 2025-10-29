// --- Library Globals ---
const { jsPDF } = window.jspdf;
const { PDFDocument } = window.PDFLib;

// --- State ---
let imageFiles = []; // For Image-to-PDF tool
let pdfFiles = [];   // For PDF-Merge tool
let splitPdfFile = null; // For Split-PDF tool
let signPdfFile = null;  // For E-Sign-PDF tool
let draggedItemId = null;
// E-Sign Canvas State
let signaturePad, signCanvasCtx, isDrawing = false;

// --- DOM Elements ---
const tabImageToPdf = document.getElementById('tab-image-to-pdf');
const tabMergePdf = document.getElementById('tab-merge-pdf');
const toolImageToPdf = document.getElementById('tool-image-to-pdf');
const toolMergePdf = document.getElementById('tool-merge-pdf');
// New Tab Elements
const tabSplitPdf = document.getElementById('tab-split-pdf');
const tabESignPdf = document.getElementById('tab-e-sign-pdf');
const toolSplitPdf = document.getElementById('tool-split-pdf');
const toolESignPdf = document.getElementById('tool-e-sign-pdf');

// Image Tool Elements
const imageDropzone = document.getElementById('image-dropzone');
const imageUpload = document.getElementById('image-upload');
const imageFileList = document.getElementById('image-file-list');
const imageSettings = document.getElementById('image-settings');
const qualitySlider = document.getElementById('pdf-quality');
const qualityValue = document.getElementById('quality-value');
const convertToPdfBtn = document.getElementById('convert-to-pdf-btn');

// PDF Merge Tool Elements
const pdfDropzone = document.getElementById('pdf-dropzone');
const pdfUpload = document.getElementById('pdf-upload');
const pdfFileList = document.getElementById('pdf-file-list');
const mergeSettings = document.getElementById('merge-settings');
const mergePdfBtn = document.getElementById('merge-pdf-btn');

// Split Tool Elements
const splitDropzone = document.getElementById('split-dropzone');
const splitUpload = document.getElementById('split-upload');
const splitFileInfo = document.getElementById('split-file-info');
const splitFileName = document.getElementById('split-file-name');
const splitTotalPages = document.getElementById('split-total-pages');
const splitSettings = document.getElementById('split-settings');
const splitPdfBtn = document.getElementById('split-pdf-btn');
const pageRangeInput = document.getElementById('page-range');

// E-Sign Tool Elements
const signDropzone = document.getElementById('sign-dropzone');
const signUpload = document.getElementById('sign-upload');
const signFileInfo = document.getElementById('sign-file-info');
const signFileName = document.getElementById('sign-file-name');
const signSettings = document.getElementById('sign-settings');
const signatureCanvas = document.getElementById('signature-canvas');
const clearSigBtn = document.getElementById('clear-sig-btn');
const sigPageInput = document.getElementById('sig-page');
const sigXInput = document.getElementById('sig-x');
const sigYInput = document.getElementById('sig-y');
const downloadSignedPdfBtn = document.getElementById('download-signed-pdf-btn');

// Global Elements
const loadingOverlay = document.getElementById('loading-overlay');
const loadingText = document.getElementById('loading-text');
const errorMessage = document.getElementById('error-message');

// New Professional UI Elements
const darkModeToggle = document.getElementById('dark-mode-toggle');
const sunIcon = document.getElementById('sun-icon');
const moonIcon = document.getElementById('moon-icon');
const privacyModal = document.getElementById('privacy-modal');
const privacyLink = document.getElementById('privacy-link');
const closeModalBtn = document.getElementById('close-modal-btn');
const modalOverlay = document.getElementById('modal-overlay');

// --- Tab Navigation ---
const tabs = [
    { id: 'image-to-pdf', btn: tabImageToPdf, tool: toolImageToPdf },
    { id: 'merge-pdf', btn: tabMergePdf, tool: toolMergePdf },
    { id: 'split-pdf', btn: tabSplitPdf, tool: toolSplitPdf },
    { id: 'e-sign-pdf', btn: tabESignPdf, tool: toolESignPdf }
];

function showTab(tabId) {
    tabs.forEach(tab => {
        const isActive = tab.id === tabId;
        tab.tool.classList.toggle('hidden', !isActive);
        tab.btn.classList.toggle('active-tab', isActive);
        tab.btn.classList.toggle('inactive-tab', !isActive);
    });
    hideError(); // Hide error on tab switch
    // Reset file inputs when switching tabs
    splitPdfFile = null;
    signPdfFile = null;
    splitSettings.classList.add('hidden');
    splitFileInfo.classList.add('hidden');
    signSettings.classList.add('hidden');
    signFileInfo.classList.add('hidden');
}

// --- Utility Functions ---
function showLoading(text = 'Processing...') {
    loadingText.textContent = text;
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove('hidden');
}

function hideError() {
    errorMessage.classList.add('hidden');
}

// --- Dark Mode Logic ---
function setDarkMode(isDark) {
    if (isDark) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
        sunIcon.classList.remove('hidden');
        moonIcon.classList.add('hidden');
    } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
        sunIcon.classList.add('hidden');
        moonIcon.classList.remove('hidden');
    }
}

function toggleDarkMode() {
    const isDark = document.documentElement.classList.contains('dark');
    setDarkMode(!isDark);
}

// --- Privacy Modal Logic ---
function openPrivacyModal() {
    privacyModal.classList.remove('hidden');
}

function closePrivacyModal() {
    privacyModal.classList.add('hidden');
}

// --- Signature Pad Logic ---
function initSignaturePad() {
    signaturePad = signatureCanvas;
    signCanvasCtx = signaturePad.getContext('2d');
    signCanvasCtx.lineWidth = 2;
    signCanvasCtx.lineCap = 'round';
    signCanvasCtx.strokeStyle = document.documentElement.classList.contains('dark') ? '#fefefe' : '#111';

    let lastPos = { x: 0, y: 0 };

    function getMousePos(e) {
        const rect = signaturePad.getBoundingClientRect();
        const scaleX = signaturePad.width / rect.width;
        const scaleY = signaturePad.height / rect.height;
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    function startDrawing(e) {
        e.preventDefault();
        isDrawing = true;
        lastPos = getMousePos(e);
    }

    function draw(e) {
        e.preventDefault();
        if (!isDrawing) return;
        const pos = getMousePos(e);
        signCanvasCtx.beginPath();
        signCanvasCtx.moveTo(lastPos.x, lastPos.y);
        signCanvasCtx.lineTo(pos.x, pos.y);
        signCanvasCtx.stroke();
        lastPos = pos;
    }

    function stopDrawing() {
        isDrawing = false;
    }

    // Mouse events
    signaturePad.addEventListener('mousedown', startDrawing);
    signaturePad.addEventListener('mousemove', draw);
    signaturePad.addEventListener('mouseup', stopDrawing);
    signaturePad.addEventListener('mouseleave', stopDrawing);
    // Touch events
    signaturePad.addEventListener('touchstart', startDrawing);
    signaturePad.addEventListener('touchmove', draw);
    signaturePad.addEventListener('touchend', stopDrawing);
}

function clearSignature() {
    signCanvasCtx.clearRect(0, 0, signaturePad.width, signaturePad.height);
}

function isSignatureEmpty() {
    const pixelBuffer = new Uint32Array(
        signCanvasCtx.getImageData(0, 0, signaturePad.width, signaturePad.height).data.buffer
    );
    return !pixelBuffer.some(color => color !== 0);
}

// --- File List Item Renderer ---
function createDraggableFileItem(file, listType) {
    const item = document.createElement('div');
    item.className = 'file-item bg-gray-100 dark:bg-gray-700 p-3 rounded-md flex justify-between items-center shadow-sm';
    item.draggable = true;
    item.dataset.id = file.id;

    const name = document.createElement('span');
    name.textContent = file.name;
    name.className = 'text-sm font-medium truncate';

    const removeBtn = document.createElement('button');
    removeBtn.innerHTML = '&times;';
    removeBtn.className = 'text-red-500 hover:text-red-700 font-bold text-xl ml-4';
    removeBtn.onclick = () => {
        if (listType === 'image') {
            removeImageFile(file.id);
        } else if (listType === 'pdf') {
            removePdfFile(file.id);
        }
    };
    
    item.appendChild(name);
    item.appendChild(removeBtn);

    // Add drag-and-drop event listeners
    item.addEventListener('dragstart', (e) => {
        draggedItemId = file.id;
        setTimeout(() => item.classList.add('dragging'), 0);
    });

    item.addEventListener('dragend', () => {
        draggedItemId = null;
        item.classList.remove('dragging');
    });

    item.addEventListener('dragover', (e) => {
        e.preventDefault();
        item.classList.add('drag-over');
    });

    item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
    });

    item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        if (draggedItemId === file.id) return;

        const fileArray = (listType === 'image') ? imageFiles : pdfFiles;
        const draggedIndex = fileArray.findIndex(f => f.id === draggedItemId);
        const droppedIndex = fileArray.findIndex(f => f.id === file.id);

        // Re-order the array
        const [draggedItem] = fileArray.splice(draggedIndex, 1);
        fileArray.splice(droppedIndex, 0, draggedItem);
        
        // Re-render the correct list
        if (listType === 'image') {
            renderImageFileList();
        } else if (listType === 'pdf') {
            renderPdfFileList();
        }
    });

    return item;
}

// --- Image to PDF Logic ---
function renderImageFileList() {
    imageFileList.innerHTML = '';
    imageFiles.forEach(file => {
        const item = createDraggableFileItem(file, 'image');
        imageFileList.appendChild(item);
    });
    imageSettings.classList.toggle('hidden', imageFiles.length === 0);
}

function addImageFiles(files) {
    hideError();
    for (const file of files) {
        const allowedTypes = ['image/png', 'image/jpeg', 'image/bmp', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            showError(`Unsupported file type: ${file.name}. Only PNG, JPEG, BMP, GIF, and WEBP are allowed.`);
            continue;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            imageFiles.push({
                id: Date.now() + Math.random(),
                name: file.name,
                dataUrl: e.target.result,
                type: file.type
            });
            renderImageFileList();
        };
        reader.readAsDataURL(file);
    }
}

function removeImageFile(id) {
    imageFiles = imageFiles.filter(file => file.id !== id);
    renderImageFileList();
}

async function convertToPdf() {
    if (imageFiles.length === 0) {
        showError('Please add at least one image.');
        return;
    }

    showLoading('Converting images to PDF...');
    hideError();

    try {
        const quality = parseInt(qualitySlider.value) / 100;
        const pageSize = document.getElementById('page-size').value;
        const orientation = document.querySelector('input[name="orientation"]:checked').value;

        const doc = new jsPDF({ orientation, unit: 'pt', format: pageSize });

        for (let i = 0; i < imageFiles.length; i++) {
            const file = imageFiles[i];
            const img = new Image();
            img.src = file.dataUrl;
            
            await new Promise(resolve => img.onload = resolve);
            
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            
            // Calculate image dimensions to fit the page while maintaining aspect ratio
            const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
            const imgWidth = img.width * ratio;
            const imgHeight = img.height * ratio;
            
            // Center the image
            const x = (pageWidth - imgWidth) / 2;
            const y = (pageHeight - imgHeight) / 2;

            if (i > 0) {
                doc.addPage();
            }
            
            // Use 'JPEG' for compression, even for PNGs.
            doc.addImage(img, 'JPEG', x, y, imgWidth, imgHeight, undefined, 'FAST', quality);
        }

        doc.save('converted-images.pdf');
    } catch (err) {
        console.error(err);
        showError('An error occurred during PDF conversion. Please try again.');
    } finally {
        hideLoading();
    }
}

// --- PDF Merge Logic ---
function renderPdfFileList() {
    pdfFileList.innerHTML = '';
    pdfFiles.forEach(file => {
        const item = createDraggableFileItem(file, 'pdf');
        pdfFileList.appendChild(item);
    });
    mergeSettings.classList.toggle('hidden', pdfFiles.length === 0);
}

function addPdfFiles(files) {
    hideError();
    for (const file of files) {
        if (file.type !== 'application/pdf') {
            showError(`Unsupported file type: ${file.name}. Only PDF files are allowed.`);
            continue;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            pdfFiles.push({
                id: Date.now() + Math.random(),
                name: file.name,
                arrayBuffer: e.target.result
            });
            renderPdfFileList();
        };
        reader.readAsArrayBuffer(file);
    }
}

function removePdfFile(id) {
    pdfFiles = pdfFiles.filter(file => file.id !== id);
    renderPdfFileList();
}

async function mergePdfs() {
    if (pdfFiles.length < 2) {
        showError('Please add at least two PDF files to merge.');
        return;
    }

    showLoading('Merging PDFs...');
    hideError();

    try {
        const mergedPdf = await PDFDocument.create();

        for (const file of pdfFiles) {
            const pdf = await PDFDocument.load(file.arrayBuffer);
            const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
            copiedPages.forEach(page => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        
        // Trigger download
        const blob = new Blob([mergedPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'merged.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (err) {
        console.error(err);
        showError('An error occurred while merging. One of the PDFs might be corrupt or encrypted.');
    } finally {
        hideLoading();
    }
}

// --- PDF Split Logic ---
async function handleSplitFile(file) {
    if (!file) return;
    if (file.type !== 'application/pdf') {
        showError('Only PDF files are allowed.');
        return;
    }
    hideError();
    showLoading('Loading PDF info...');
    
    const arrayBuffer = await file.arrayBuffer();
    let pageCount = 0;
    try {
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        pageCount = pdfDoc.getPageCount();
    } catch (err) {
        showError('Could not read PDF. File may be corrupt.');
        hideLoading();
        return;
    }

    splitPdfFile = {
        name: file.name,
        arrayBuffer: arrayBuffer,
        pageCount: pageCount
    };

    splitFileName.textContent = file.name;
    splitTotalPages.textContent = pageCount;
    splitFileInfo.classList.remove('hidden');
    splitSettings.classList.remove('hidden');
    pageRangeInput.value = `1-${pageCount}`; // Default to all pages
    hideLoading();
}

function parsePageRange(rangeStr, totalPages) {
    const indices = new Set();
    if (!rangeStr) return [];
    
    rangeStr = rangeStr.replace(/\s/g, '').replace(/end/gi, totalPages);
    const parts = rangeStr.split(',');

    for (const part of parts) {
        if (part.includes('-')) {
            let [start, end] = part.split('-').map(Number);
            if (isNaN(start) || isNaN(end) || start < 1 || end > totalPages || start > end) {
                throw new Error(`Invalid range: "${part}"`);
            }
            for (let i = start; i <= end; i++) {
                indices.add(i - 1); // 0-based index
            }
        } else {
            const page = Number(part);
            if (isNaN(page) || page < 1 || page > totalPages) {
                throw new Error(`Invalid page: "${part}"`);
            }
            indices.add(page - 1); // 0-based index
        }
    }
    return Array.from(indices).sort((a, b) => a - b);
}

async function splitPdf() {
    if (!splitPdfFile) {
        showError('Please select a PDF file first.');
        return;
    }
    
    let pagesToKeep;
    try {
        pagesToKeep = parsePageRange(pageRangeInput.value, splitPdfFile.pageCount);
        if (pagesToKeep.length === 0) {
            showError('Please enter a valid page range.');
            return;
        }
    } catch (err) {
        showError(err.message);
        return;
    }

    showLoading('Splitting PDF...');
    hideError();

    try {
        const pdfDoc = await PDFDocument.load(splitPdfFile.arrayBuffer);
        const newDoc = await PDFDocument.create();
        
        const copiedPages = await newDoc.copyPages(pdfDoc, pagesToKeep);
        copiedPages.forEach(page => newDoc.addPage(page));

        const newPdfBytes = await newDoc.save();
        const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `split_${splitPdfFile.name}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (err) {
        console.error(err);
        showError('An error occurred while splitting the PDF.');
    } finally {
        hideLoading();
    }
}

// --- E-Sign PDF Logic ---
async function handleSignFile(file) {
    if (!file) return;
    if (file.type !== 'application/pdf') {
        showError('Only PDF files are allowed.');
        return;
    }
    hideError();
    showLoading('Loading PDF...');

    const arrayBuffer = await file.arrayBuffer();
    let pageCount = 0;
    try {
        const pdfDoc = await PDFDocument.load(arrayBuffer);
        pageCount = pdfDoc.getPageCount();
    } catch (err) {
        showError('Could not read PDF. File may be corrupt.');
        hideLoading();
        return;
    }

    signPdfFile = {
        name: file.name,
        arrayBuffer: arrayBuffer,
        pageCount: pageCount
    };
    
    sigPageInput.max = pageCount;
    signFileName.textContent = file.name;
    signFileInfo.classList.remove('hidden');
    signSettings.classList.remove('hidden');
    clearSignature();
    hideLoading();
}

async function embedSignature() {
    if (!signPdfFile) {
        showError('Please select a PDF file first.');
        return;
    }
    if (isSignatureEmpty()) {
        showError('Please draw a signature first.');
        return;
    }
    
    const pageNum = parseInt(sigPageInput.value);
    const xPos = parseInt(sigXInput.value);
    const yPos = parseInt(sigYInput.value);

    if (isNaN(pageNum) || pageNum < 1 || pageNum > signPdfFile.pageCount) {
        showError(`Please enter a valid page number (1-${signPdfFile.pageCount}).`);
        return;
    }
    if (isNaN(xPos) || isNaN(yPos)) {
        showError('Please enter valid X and Y positions.');
        return;
    }

    showLoading('Applying signature...');
    hideError();

    try {
        const pdfDoc = await PDFDocument.load(signPdfFile.arrayBuffer);
        const page = pdfDoc.getPage(pageNum - 1); // 0-based

        const pngDataUrl = signatureCanvas.toDataURL('image/png');
        const pngBytes = await fetch(pngDataUrl).then(res => res.arrayBuffer());
        const pngImage = await pdfDoc.embedPng(pngBytes);
        
        // Scale signature to be ~100px wide
        const sigDims = pngImage.scale(100 / pngImage.width);

        // PDF Y-coordinate starts from the bottom. User Y starts from the top.
        // We need to convert.
        const pageHeight = page.getHeight();
        const finalY = pageHeight - yPos - sigDims.height;

        page.drawImage(pngImage, {
            x: xPos,
            y: finalY,
            width: sigDims.width,
            height: sigDims.height,
        });

        const newPdfBytes = await pdfDoc.save();
        const blob = new Blob([newPdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `signed_${signPdfFile.name}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

    } catch (err) {
        console.error(err);
        showError('An error occurred while signing the PDF.');
    } finally {
        hideLoading();
    }
}

// --- Feedback Box Functions ---
let feedbackOpen = false;

function toggleFeedback() {
    const form = document.getElementById('feedback-form');
    const trigger = document.querySelector('.feedback-trigger');
    
    if (!feedbackOpen) {
        form.classList.remove('hidden');
        trigger.style.display = 'none';
        feedbackOpen = true;
    }
}

function closeFeedback() {
    const form = document.getElementById('feedback-form');
    const trigger = document.querySelector('.feedback-trigger');
    
    form.classList.add('hidden');
    trigger.style.display = 'block';
    feedbackOpen = false;
    document.getElementById('feedback-text').value = '';
}

function submitFeedback() {
    const text = document.getElementById('feedback-text').value.trim();
    if (text) {
        // Simulate feedback submission
        alert('Thank you for your feedback!');
        closeFeedback();
    }
}

// --- Event Listeners ---
// Initial setup
document.addEventListener('DOMContentLoaded', () => {
    showTab('image-to-pdf'); // Show first tab by default
    
    // --- Global Drag/Drop for file inputs ---
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.body.addEventListener(eventName, e => e.preventDefault());
    });

    // --- Image Tool Event Listeners ---
    qualitySlider.addEventListener('input', (e) => {
        qualityValue.textContent = e.target.value;
    });

    imageUpload.addEventListener('change', (e) => addImageFiles(e.target.files));
    imageDropzone.addEventListener('click', () => imageUpload.click());
    imageDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        addImageFiles(e.dataTransfer.files);
    });
    convertToPdfBtn.addEventListener('click', convertToPdf);

    // --- PDF Merge Tool Event Listeners ---
    pdfUpload.addEventListener('change', (e) => addPdfFiles(e.target.files));
    pdfDropzone.addEventListener('click', () => pdfUpload.click());
    pdfDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        addPdfFiles(e.dataTransfer.files);
    });
    mergePdfBtn.addEventListener('click', mergePdfs);

    // --- New Split PDF Listeners ---
    splitUpload.addEventListener('change', (e) => handleSplitFile(e.target.files[0]));
    splitDropzone.addEventListener('click', () => splitUpload.click());
    splitDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        handleSplitFile(e.dataTransfer.files[0]);
    });
    splitPdfBtn.addEventListener('click', splitPdf);

    // --- New E-Sign PDF Listeners ---
    signUpload.addEventListener('change', (e) => handleSignFile(e.target.files[0]));
    signDropzone.addEventListener('click', () => signUpload.click());
    signDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        handleSignFile(e.dataTransfer.files[0]);
    });
    initSignaturePad(); // Setup canvas drawing
    clearSigBtn.addEventListener('click', clearSignature);
    downloadSignedPdfBtn.addEventListener('click', embedSignature);

    // --- New UI Event Listeners ---
    darkModeToggle.addEventListener('click', toggleDarkMode);
    privacyLink.addEventListener('click', openPrivacyModal);
    closeModalBtn.addEventListener('click', closePrivacyModal);
    modalOverlay.addEventListener('click', closePrivacyModal);

    // --- Initialize Dark Mode ---
    const isDarkMode = document.documentElement.classList.contains('dark');
    setDarkMode(isDarkMode); // Syncs icons on load

    // --- Show feedback box on page load ---
    setTimeout(() => {
        document.getElementById('feedback-box').classList.add('show');
    }, 1000);
});

// Apply tab button styles
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.add('py-3', 'px-6', 'font-semibold', 'text-gray-600', 'dark:text-gray-300', 'border-b-2', 'border-transparent', 'transition-all', 'whitespace-nowrap');
    if (btn.classList.contains('active-tab')) {
        btn.classList.add('text-indigo-600', 'dark:text-indigo-400', 'border-indigo-600');
    } else {
        btn.classList.add('hover:text-indigo-500', 'hover:border-gray-400');
    }
});

// Override for active tab
document.styleSheets[0].insertRule('.tab-btn.active-tab { color: #4f46e5 !important; border-color: #4f46e5 !important; }');
document.styleSheets[0].insertRule('.dark .tab-btn.active-tab { color: #818cf8 !important; border-color: #818cf8 !important; }');