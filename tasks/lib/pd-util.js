(function() {
  "use strict";
  exports.init = function(grunt) {
    var exports, shell;
    shell = require("shelljs");
    exports = {};
    exports.acf_import = function() {
      var cmd;
      cmd = 'wp acf import all';
      return shell.exec(cmd, {
        silent: true
      });
    };
    exports.convert_data = function() {
      var cmd;
      cmd = 'wp eval-file core/conversion-script.php';
      return console.log(shell.exec(cmd, {
        silent: true
      }).output);
    };
    return exports;
  };

}).call(this);
