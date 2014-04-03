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
    exports.pd_wp_cli = function() {
      shell.exec('wp theme activate pizza-d-theme');
      shell.exec('wp plugin deactivate pd-tools-old-school adminimize gd-taxonomies-tools');
      return shell.exec('wp plugin activate query-monitor pd-tools');
    };
    return exports;
  };

}).call(this);
