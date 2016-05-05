if (!process.env.PORT) {
    process.env.PORT = 8080;
}

var N = 500;
var postanek = 500; // v milisekundah

var mime = require('mime');
var formidable = require('formidable');
var http = require('http');
var fs = require('fs-extra');
var util = require('util');
var path = require('path');

var dataDir = "./data/";

var streznik = http.createServer(function(zahteva, odgovor) {
   if (zahteva.url == '/') {
       posredujOsnovnoStran(odgovor);
   } else if (zahteva.url == '/datoteke') { 
       posredujSeznamDatotek(odgovor);
   } else if (zahteva.url.startsWith('/brisi')) { 
       izbrisiDatoteko(odgovor, dataDir + zahteva.url.replace("/brisi", ""));
   } else if (zahteva.url.startsWith('/prenesi')) {
       posredujStaticnoVsebino(odgovor, dataDir + zahteva.url.replace("/prenesi", ""), "application/octet-stream");
   } else if (zahteva.url == "/nalozi") {
       naloziDatoteko(zahteva, odgovor);
   } else if (zahteva.url == "/testiraj") {
       console.log("----TESTIRAM---------");
       console.log("----delay: "+postanek+" ms");
       console.log("----stevilo datotek: "+N);
       testirajDatoteko(zahteva, odgovor);
   } else if (zahteva.url.startsWith('/poglej')) {
       posredujStaticnoVsebino(odgovor, dataDir + zahteva.url.replace("/poglej", ""), "");
   } else if (zahteva.url.startsWith('/zahtevek')) {
       pridobiCasZahteve(odgovor, zahteva.url.replace("/zahtevek/", ""));
   } else {
       posredujStaticnoVsebino(odgovor, './public' + zahteva.url, "");
   }
});

streznik.listen(process.env.PORT, function(){
   console.log("streznik zagnan"); 
    
});

function posredujOsnovnoStran(odgovor) {
    posredujStaticnoVsebino(odgovor, './public/odlagalisce.html', "");
}

function posredujStaticnoVsebino(odgovor, absolutnaPotDoDatoteke, mimeType) {
        fs.exists(absolutnaPotDoDatoteke, function(datotekaObstaja) {
            if (datotekaObstaja) {
                fs.readFile(absolutnaPotDoDatoteke, function(napaka, datotekaVsebina) {
                    if (napaka) {
                        posredujNapako500(odgovor);
                    } else {
                        posredujDatoteko(odgovor, absolutnaPotDoDatoteke, datotekaVsebina, mimeType);
                    }
                });
            } else {
                posredujNapako404(odgovor);
            }
        });
}

function posredujDatoteko(odgovor, datotekaPot, datotekaVsebina, mimeType) {
    if (mimeType == "") {
        odgovor.writeHead(200, {'Content-Type': mime.lookup(path.basename(datotekaPot))});    
    } else {
        odgovor.writeHead(200, {'Content-Type': mimeType});
    }
    
    odgovor.end(datotekaVsebina);
}

function posredujSeznamDatotek(odgovor) {
    odgovor.writeHead(200, {'Content-Type': 'application/json'});
    fs.readdir(dataDir, function(napaka, datoteke) {
        if (napaka) {
            posredujNapako500(odgovor);
        } else {
            var rezultat = [];
            for (var i=0; i<datoteke.length; i++) {
                var datoteka = datoteke[i];
                var velikost = fs.statSync(dataDir+datoteka).size;    
                rezultat.push({datoteka: datoteka, velikost: velikost});
            }
            
            odgovor.write(JSON.stringify(rezultat));
            odgovor.end();      
        }
    });
}

var ime;
var koncnica;
var zacasnaPot;

function naloziDatoteko(zahteva, odgovor) {
    var form = new formidable.IncomingForm();
 
    form.parse(zahteva, function(napaka, polja, datoteke) {
        util.inspect({fields: polja, files: datoteke});
    });
 
    form.on('end', function(fields, files) {
        var zacasnaPot = form.openedFiles[0].path;
        var datoteka = form.openedFiles[0].name;
        console.log("nalagam"+ " "+ zacasnaPot+ " "+ datoteka);
        fs.copy(zacasnaPot, dataDir + datoteka, function(napaka) {  
            if (napaka) {
                posredujNapako500(odgovor);
            } else {
                posredujOsnovnoStran(odgovor);        
            }
        });
    });
}

////////////////////////////   TEST    ////////////////////////////////////////////

function testirajDatoteko(zahteva, odgovor){
    zacetniPrenos(zahteva, odgovor, function(){
        brisiDat(odgovor, dataDir+ime[1]+koncnica[1], function(){
            console.log("*");
            for(var i = 0;i < N;i ++){
                cikel(i, zahteva, odgovor);
            }
        });
    });
}

function cikel(i, zahteva, odgovor) {
  setTimeout(function() {
      var t = process.hrtime();
      naloziDat(i, zahteva, odgovor, zacasnaPot, function(indeks){
        t = process.hrtime(t);
        console.log(t[0]+((t[1] / 1000000).toFixed(3))+"; ");
        brisiDat(odgovor, dataDir+ime[1]+indeks+koncnica[1], function(){
            if(i == N-1){
                
            }
        });
    });
  },i*postanek);
}

var naloziDat = function(indeks, zahteva, odgovor, zacasnaPot, callback) {
    fs.copy(zacasnaPot, dataDir + ime[1] + indeks + koncnica[1], function(napaka) {  //kopiraj dat iz zacasnaPot v dataDir+datoteka
        if (napaka) {
            console.log("error nalaganje");
        } else {
            callback(indeks);
        }
    });
}

var brisiDat = function(odgovor, absolutnaPotDoDatoteke, callback){
    fs.unlink(absolutnaPotDoDatoteke, function(err) {
        if (err) {
            return console.error(err);
        } else {
            callback();
        }
    });
}

var zacetniPrenos = function (zahteva, odgovor, callback){
    var t = process.hrtime();
    var form = new formidable.IncomingForm();
 
    form.parse(zahteva, function(napaka, polja, datoteke) {
        util.inspect({fields: polja, files: datoteke});
    });
 
    form.on('end', function(fields, files) {
        
        var imeReg = /(.+?(?=\..*))/;
        var koncnicaReg = /.*(\..*)/;
        zacasnaPot = form.openedFiles[0].path;
        var datoteka = form.openedFiles[0].name;
               
        t = process.hrtime(t);
        console.log("cas priprave= "+t[0]+((t[1] / 1000000).toFixed(3)));
        
        ime = datoteka.match(imeReg);
        koncnica = datoteka.match(koncnicaReg);
        
        var velikost = form.openedFiles[0].size;
        console.log("----velikost: "+ velikost + " b ");
        console.log("zacetna datoteka: "+ zacasnaPot+ " "+ datoteka);
        fs.copy(zacasnaPot, dataDir + datoteka, function(napaka) {  
            if (napaka) {
                posredujNapako500(odgovor);
            } else {
                posredujOsnovnoStran(odgovor);  
                callback();
            }
        });
    });
}

function pridobiCasZahteve(odgovor, t1Start){
    console.log(new Date().getTime()-t1Start);
    var t3 = (new Date().getTime()).toString();
    odgovor.write(t3);
    odgovor.end();
}
/////////////////////////    TEST   ///////////////////////////////////////////////

function izbrisiDatoteko(odgovor, absolutnaPotDoDatoteke){
    console.log("Going to delete an existing file: "+absolutnaPotDoDatoteke);
    fs.unlink(absolutnaPotDoDatoteke, function(err) {
        if (err) {
            return console.error(err);
        } else {
            odgovor.write("Datoteka izbrisana");
            odgovor.end(); 
        }
    });
}

function posredujNapako404(odgovor){
    odgovor.writeHead(404, {'Content-Type' : 'text/plain'});
    odgovor.write("Napaka 404: ne najdem zahtevane vsebine.");
    odgovor.end;
}
function posredujNapako500(odgovor){
    odgovor.writeHead(500, {'Content-Type' : 'text/plain'});
    odgovor.write("Napaka 500: napaka na strezniku.");
    odgovor.end;
}