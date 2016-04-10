if (!process.env.PORT) {
    process.env.PORT = 8080;
}

var N = 2;

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
       console.log(zahteva.url);
       testirajDatoteko(zahteva, odgovor);
   } else if (zahteva.url.startsWith('/poglej')) {
       posredujStaticnoVsebino(odgovor, dataDir + zahteva.url.replace("/poglej", ""), "");
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
                })
            } else {
                posredujNapako404(odgovor);
            }
        })
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
    })
}

var datoteka

function naloziDatoteko(zahteva, odgovor) {
    var form = new formidable.IncomingForm();
 
    form.parse(zahteva, function(napaka, polja, datoteke) {
        util.inspect({fields: polja, files: datoteke});
    });
 
    form.on('end', function(fields, files) {
        var zacasnaPot = this.openedFiles[0].path;
        datoteka = this.openedFiles[0].name;
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
    
    zacetniPrenos(zahteva, odgovor, function(zacasnaPot){
        brisiDat(odgovor, dataDir+zahteva.url.replace("/testiraj","")+datoteka, function(absolutnaPotDoDatoteke){
            console.log("*");
            
            for(var i = 0;i < N;i ++){ //ne gre sinhrono
                !function outer(i){
                    naloziDat(zahteva, odgovor, zacasnaPot, function(napaka){
                        brisiDat(odgovor, absolutnaPotDoDatoteke, function(pot){
                            console.log("**");
                        });
                    });
                }(i)
            }
        });
    });

}

var naloziDat = function(zahteva, odgovor, zacasnaPot, callback) {
    console.log("testing "+ zacasnaPot+ " "+ datoteka);
    
    fs.copy(zacasnaPot, dataDir + datoteka, function(napaka) {  //kopiraj dat iz zacasnaPot v dataDir+datoteka
        if (napaka) {
            posredujNapako500(odgovor);
        } else {
            posredujOsnovnoStran(odgovor);
            callback(napaka);
        }
    });
}

var brisiDat = function(odgovor, absolutnaPotDoDatoteke, callback){
    console.log("Going to delete an existing file: "+absolutnaPotDoDatoteke);
    fs.unlink(absolutnaPotDoDatoteke, function(err) {
        if (err) {
            return console.error(err);
        } else {
            posredujOsnovnoStran(odgovor); 
            callback(absolutnaPotDoDatoteke);
        }
    });
}

var zacetniPrenos = function (zahteva, odgovor, callback){
     var form = new formidable.IncomingForm();
 
    form.parse(zahteva, function(napaka, polja, datoteke) {
        util.inspect({fields: polja, files: datoteke});
    });
 
    form.on('end', function(fields, files) {
        var zacasnaPot = this.openedFiles[0].path;
        datoteka = this.openedFiles[0].name;
        console.log("nalagam"+ " "+ zacasnaPot+ " "+ datoteka);
        fs.copy(zacasnaPot, dataDir + datoteka, function(napaka) {  
            if (napaka) {
                posredujNapako500(odgovor);
            } else {
                posredujOsnovnoStran(odgovor);  
                callback(zacasnaPot);
            }
        });
    });
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