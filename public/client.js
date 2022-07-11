$(document).ready(() => {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    if (urlParams.has("apiKey")) {
        const apiKey = urlParams.get("apiKey");
        fetch("https://localt-my-api.herokuapp.com/api/validateKey/"+apiKey, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json'
            }
        }).then(res => {
            if (res.status === 404) {
                window.location.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
                return;
            }
            $("#safe-wrapper").show();
            $("#key-field").text(apiKey);
        });
    } else {
        window.location.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
    }
});