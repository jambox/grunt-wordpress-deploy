"use strict"

exports.init = (grunt) ->
  shell = require "shelljs"
  exports = {}

exports.acf_import = () ->
  cmd = 'wp acf import all'
  shell.exec(cmd, silent: true )

exports.convert_data = () ->
  cmd = 'wp eval-file core/conversion-script.php'
  console.log shell.exec(cmd, silent: true ).output

exports