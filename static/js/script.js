
document.addEventListener('DOMContentLoaded', function() {
    const uploadForm = document.getElementById('upload-form');
    const loadingOverlay = document.getElementById('loading-overlay');

    if (uploadForm) {
        uploadForm.addEventListener('submit', function() {
            // Show the loading overlay when the form is submitted
            if (loadingOverlay) {
                loadingOverlay.style.display = 'flex';
            }
        });
    }

    // The spinner will be hidden automatically when the new page loads,
    // as the 'loading-overlay' is hidden by default in the CSS.
    // No additional code is needed to hide it after the analysis.
});
