//http-server -c1 -p80

function addLineups() {
    let tags = document.getElementsByTagName("*")
    for (let i = 0; i < tags.length; i++) {
        let elmnt = tags[i] 
        let file = elmnt.getAttribute("include-lineup")
        if (file) {
            let xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function() {
                if (this.readyState == 4) {
                    if (this.status == 200) {
                        elmnt.innerHTML = this.responseText;
                    }
                    if (this.status == 404) {
                        elmnt.innerHTML = "Page not found.";
                    }
                    
                    elmnt.removeAttribute("include-lineup");
                    addLineups();
                }
            }
            xhttp.open("GET", file, true);
            xhttp.send();

            return;
        }
    }
}

function openTab(event, tabName) {
    let tabcontent = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
  
    let tablinks = document.getElementsByClassName("tab-links");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
  
    document.getElementById(tabName).style.display = "flex";
    event.currentTarget.className += " active";
}

document.getElementById("defaultOpen").click();