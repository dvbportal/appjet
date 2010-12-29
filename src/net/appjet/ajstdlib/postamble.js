var p = appjet._internal.page.render();

//  p.forEach(function(x) {
//    appjet._native.write(x);
//  });

{
  var output = p.join('');
  if (output.length > 0)
    appjet._native.write(output);
}

//var seconds = ((new Date()).valueOf() - _tstart) / 1000.0;
//var tstr = sprintf("%8s", sprintf("%.3f", seconds));
//appjet._native.write("<p>actual time: "+tstr+"</p>");
//appjet._native.write(' array was '+p.length+'\n\n');

