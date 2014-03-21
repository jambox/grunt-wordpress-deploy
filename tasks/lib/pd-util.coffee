"use strict"

exports.init = (grunt) ->
  shell = require "shelljs"
  exports = {}

  exports.acf_import = ->
    cmd = 'wp acf import all'
    shell.exec(cmd, silent: true )

  exports.convert_data = ->
    cmd = 'wp eval-file core/conversion-script.php'
    console.log shell.exec(cmd, silent: true ).output

  exports.pd_wp_cli = ->
    shell.exec 'wp theme activate pizza-d-theme'

    shell.exec 'wp plugin activate query-monitor'

    shell.exec 'wp plugin deactivate pd-tools-old-school'

    shell.exec 'wp plugin activate pd-tools'

exports