# GPIO REST

This small project expose GPIO digital PINs and analogue values from PCF8591 chip via REST interface.

Dependencies npm:
- require('http');
- require('express');
- require('rpio');
- require('pcf8591');

Project is mainly inspired with many thanks by 
http://www.robert-drummond.com/2015/06/01/rest-api-on-a-pi-part-2-control-your-gpio-io-ports-over-the-internet/

Start server:
------------
 cd rest-gpio  
 sudo node gpioapi.js > stdout.txt 2> stderr.txt &  

Examples:
--------

Get PCF8591 Analogue value read first http://www.nxp.com/documents/data_sheet/PCF8591.pdf
- request:
  http://192.168.1.16:3500/inputs/**ADC01**
- response:
  {"pin":0,"gpio":"ADC01","AIN":1,"value":246}
  


