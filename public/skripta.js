window.addEventListener('load', function() {
	//stran nalozena
	
	
	var prizgiCakanje = function() {
		document.querySelector(".loading").style.display = "block";
	}
	
	var ugasniCakanje = function() {
		document.querySelector(".loading").style.display = "none";
	}
	
	document.querySelector("#nalozi").addEventListener("click", prizgiCakanje);
	
	//Pridobi seznam datotek
	var pridobiSeznamDatotek = function(event) {
		prizgiCakanje();
		var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function() {
			if (xhttp.readyState == 4 && xhttp.status == 200) { //ko bo imel pripravljen streznik podatke naredi to
				var datoteke = JSON.parse(xhttp.responseText);
				
				var datotekeHTML = document.querySelector("#datoteke");
				
				for (var i=0; i<datoteke.length; i++) {
					var datoteka = datoteke[i];
					
					var velikost = datoteka.velikost;
					if(velikost <= 1000){
						var enota = "B";
					}
					else if(velikost <= 1000000){
						var enota = "KB";
					}
					else if(velikost <= 1000000000){
						var enota = "MB";
					}
					else{
						var enota = "GB";
					}
					
					datotekeHTML.innerHTML += " \
						<div class='datoteka senca rob'> \
							<div class='naziv_datoteke'> " + datoteka.datoteka + "  (" + velikost + " " + enota + ") </div> \
							<div class='akcije'> \
							| <span><a href='/prenesi/" + datoteka.datoteka + "' target='_self'>Prenesi</a></span> \
							| <span akcija='brisi' datoteka='"+ datoteka.datoteka +"'>Izbriši</span> </div> \
					    </div>";	
				}
				
				if (datoteke.length > 0) {
					document.querySelector("span[akcija=brisi]").addEventListener("click", brisi);
				}
				ugasniCakanje();
			}
		};
		xhttp.open("GET", "/datoteke", true); //naredi zahtevo tipa get, / je home url, true je asinhrono
		xhttp.send(); //poslji zahtevo
	}
	
	pridobiSeznamDatotek();
	
	var brisi = function(event) {
		prizgiCakanje();
		var xhttp = new XMLHttpRequest();
		xhttp.onreadystatechange = function() {
			if (xhttp.readyState == 4 && xhttp.status == 200) {
				if (xhttp.responseText == "Datoteka izbrisana") {
					window.location = "/";
				} else {
					alert("Datoteke ni bilo možno izbrisati!");
				}
			}
			ugasniCakanje();
		};
		xhttp.open("GET", "/brisi/"+this.getAttribute("datoteka"), true);
		xhttp.send();
	}

});