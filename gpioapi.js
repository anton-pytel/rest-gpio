
var http = require('http');
var express = require('express');
var rpio = require('rpio');
var PCF8591 = require('pcf8591');


var app = express();

var inputs = [{ pin: 11, gpio: '17', value: null },
              { pin: 12, gpio: '18', value: null }];

var ADCinputs = [{ pin: 0, gpio: 'ADC00', AIN: 0, value: null },
                 { pin: 0, gpio: 'ADC01', AIN: 1, value: null} ];			  
			 

// GPIO init			 
rpio.init({gpiomem: false});
function initinputs() {
  var i;
  for (i in inputs) {
     console.log('opening GPIO port ' + inputs[i].gpio + ' on pin ' + inputs[i].pin + ' as input');
     rpio.open(inputs[i].pin, rpio.INPUT);
  }
}
initinputs();

// ADC init
var pcf8591 = new PCF8591();
// Reconfigure control register following the Datasheet. 
pcf8591.configure(0x45);
 
// Discard first reading after POR or read mode change. 
pcf8591.read(function(error, sample) {
    console.log('Discarded sample: 0x' + sample.toString(16));
});
pcf8591.readBytes(4, function(error, buffer) {
    console.log('Discarded samples: ' +
                '0x' + buffer[0].toString(16) + ' ' +
                '0x' + buffer[1].toString(16) + ' ' +
                '0x' + buffer[2].toString(16) + ' ' +
                '0x' + buffer[3].toString(16)
               );
});

 
// -----------------------------
var output = 0x00;
function getADCValue(AIN, callback){
	var events = require('events');
	// Create an eventEmitter object
	var eventEmitter = new events.EventEmitter();    	
	
    // Toggle output. 
    output ^= 0xff;
	var value;
    pcf8591.write(output);
    // Read all channels at once. 
    pcf8591.readBytes(4, function(error, buffer) {
        console.log('0x' + buffer[0].toString(16) + ' ' +  buffer[0] + ' ' +
                    '0x' + buffer[1].toString(16) + ' ' +  buffer[1] + ' ' +
                    '0x' + buffer[2].toString(16) + ' ' +  buffer[2] + ' ' +
                    '0x' + buffer[3].toString(16) + ' ' +  buffer[3] 
                   );
	    if (typeof AIN === 'undefined') {
			value = buffer;
		} else {
		  value = buffer[AIN];
		}
		callback(value);
    });
}

function convertR2lux(R){
  /* Fourier transform:
     f(x) =  a0 + a1*cos(x*w) + b1*sin(x*w)
	 Coefficients (with 95% confidence bounds):
       a0 =       158.3  (155.3, 161.4)
       a1 =         153  (151, 155)
       b1 =      -22.47  (-30.21, -14.72)
       w =     0.01288  (0.01263, 0.01312)
  */  
  var a0 = 158.3;
  var a1 = 153;
  var b1 = -22.47;
  var w = 0.01288;
	return Math.round(a0 + a1*Math.cos(R*w) + b1*Math.sin(R*w));
}

app.use(express.static(__dirname));

// Express route for incoming requests for a single input
app.get('/inputs/:id', function (req, res) {
  var i;

  console.log('received API request for port number ' + req.params.id);
  
  for (i in inputs){
    if ((req.params.id === inputs[i].gpio)) {
      // send to client an inputs object as a JSON string
      inputs[i].value =  rpio.read(inputs[i].pin);
      console.log('reading GPIO port ' + inputs[i].gpio + ' on pin ' + inputs[i].pin + ' Value = ' + inputs[i].value);	  
      res.send(inputs[i]);
      return;
    }
  } // for
  for (i in ADCinputs){
    if ((req.params.id === ADCinputs[i].gpio)) {
		// send to client an inputs object as a JSON string
		getADCValue(ADCinputs[i].AIN, function(xValue) {
		  ADCinputs[i].value = convertR2lux(xValue);
		  console.log('reading ADC port ' + ADCinputs[i].gpio + ' Value = ' + ADCinputs[i].value);	
		  console.log(xValue);
		  res.send(ADCinputs[i]);	
		});
		return;
	}    
  }

  console.log('invalid input port');
  res.status(403).send('dont recognise that input port number ' + req.params.id);
}); // apt.get()

// Express route for incoming requests for a list of all inputs
app.get('/inputs', function (req, res) {
  // send array of inputs objects as a JSON string
  console.log('all inputs');
  res.status(200).send(inputs);
}); // apt.get()

// Express route for any other unrecognised incoming requests
app.get('*', function (req, res) {
  res.status(404).send('Unrecognised API call');
});

// Express route to handle errors
app.use(function (err, req, res, next) {
  if (req.xhr) {
    res.status(500).send('Oops, Something went wrong!');
  } else {
    next(err);
  }
}); // apt.use()

process.on('SIGINT', function() {
  var i;

  console.log("\nGracefully shutting down from SIGINT (Ctrl+C)");

  console.log("closing GPIO...");
  for (i in inputs) {
    rpio.close(inputs[i].pin);
  }
  //rpio.i2cEnd();
  process.exit();
});

app.listen(3500);
console.log('App Server running at port 3500');

