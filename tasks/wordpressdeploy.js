/*
 * grunt-wordpress-deploy
 * https://github.com/webrain/grunt-wordpress-deploy
 *
 * Copyright (c) 2013 Webrain
 * Licensed under the MIT license.
 */

'use strict';

var grunt = require('grunt');
var util  = require('../tasks/lib/util.js').init(grunt);

module.exports = function(grunt) {

  /**
   * DB PUSH
   * pushes local database to remote database
   */
  grunt.registerTask('push_db', 'Push to Database', function() {

    var task_options    = grunt.config.get('wordpressdeploy')['options'];

    var target = grunt.option('target') || task_options['target'];

    if ( typeof target === "undefined" || typeof grunt.config.get('wordpressdeploy')[target] === "undefined")  {
      grunt.fail.warn("Invalid target specified. Did you pass the wrong argument? Please check your task configuration.", 6);
    }

    // Grab the options
    var target_options      = grunt.config.get('wordpressdeploy')[target];
    var local_options       = grunt.config.get('wordpressdeploy').local;

    // Generate required backup directories and paths
    var local_backup_paths  = util.generate_backup_paths("local", task_options);
    var target_backup_paths = util.generate_backup_paths(target, task_options);
    var dest_backup_paths = util.generate_backup_paths('adapted/'+target, task_options);

    grunt.log.subhead("Pushing database from 'Local' to '" + target_options.title + "'");

    util.check_for_mysql(grunt);

    // Check to see if manual sql source is set and validate file
    if( util.validate_sql_src_file(grunt) ) {
      dest_backup_paths.file = grunt.option('sql-src')
    }

    // Dump local DB
    grunt.log.subhead("Dumping Local DB:");
    util.db_dump(local_options, local_backup_paths);

    // Search and Replace database refs
    grunt.log.subhead("Adapting:");
    util.db_adapt(local_options, target_options, local_backup_paths.file, dest_backup_paths.file);

    // Dump target DB
    grunt.log.subhead("Dumping Target DB (" + target_options.title + "):");
    util.db_dump(target_options, target_backup_paths);

    // Import dump to target DB
    grunt.log.subhead("Importing to Target DB (" + target_options.title + "):");
    util.db_import(target_options, dest_backup_paths.file);

    grunt.log.subhead("Operations completed");
  });

  /**
   * DB PULL
   * pulls remote database into local database
   */
  grunt.registerTask('pull_db', 'Pull from Database', function() {

    var task_options = grunt.config.get('wordpressdeploy')['options'];
    var target       = grunt.option('target') || task_options['target'];

    if ( typeof target === "undefined" || typeof grunt.config.get('wordpressdeploy')[target] === "undefined")  {
      grunt.fail.warn("Invalid target provided. I cannot pull a database from nowhere! Please checked your configuration and provide a valid target.", 6);
    }

    // Grab the options
    var target_options      = grunt.config.get('wordpressdeploy')[target];
    var local_options       = grunt.config.get('wordpressdeploy').local;

    // Generate required backup directories and paths
    var local_backup_paths  = util.generate_backup_paths("local", task_options);
    var target_backup_paths = util.generate_backup_paths(target, task_options);
    var dest_backup_paths = util.generate_backup_paths('adapted/'+target, task_options);

    // Start execution
    grunt.log.subhead("Pulling database from '" + target_options.title + "' into Local");


    util.check_for_mysql(grunt);

    // Dump Target DB
    util.db_dump(target_options, target_backup_paths );

    grunt.log.subhead("Adapting sqldump to target");
    util.db_adapt(target_options,local_options,target_backup_paths.file, dest_backup_paths.file);

    // Backup Local DB
    util.db_dump(local_options, local_backup_paths);

    // Import dump into Local
    util.db_import(local_options,dest_backup_paths.file);

    grunt.log.subhead("Operations completed");
  });

  /**
   * Push files
   * Sync all local files with the remote location
   */
  grunt.registerTask("push_files", "Transfer files to a remote host with rsync.", function () {

    var task_options = grunt.config.get('wordpressdeploy')['options'];
    var target       = grunt.option('target') || task_options['target'];

    if ( typeof target === "undefined" || typeof grunt.config.get('wordpressdeploy')[target] === "undefined")  {
      grunt.fail.warn("Invalid target provided. I cannot push files from nowhere! Please checked your configuration and provide a valid target.", 6);
    }

    // Grab the options
    var target_options      = grunt.config.get('wordpressdeploy')[target];
    var local_options       = grunt.config.get('wordpressdeploy').local;
    var rsync_args = util.compose_rsync_options(task_options.rsync_args);
    var exclusions = util.compose_rsync_exclusions(task_options.exclusions);

    var local_path = util.get_path( local_options, grunt );
    var target_path = util.get_path( target_options, grunt );

    var config = {
      rsync_args: task_options.rsync_args.join(' '),
      ssh_host: target_options.ssh_host,
      from: local_path,
      to: target_path,
      exclusions: exclusions
    };

    util.rsync_push(config);
  });

  /**
   * Pull files
   * Sync all target files with the local location
   */
  grunt.registerTask("pull_files", "Transfer files to a remote host with rsync.", function () {

    var task_options = grunt.config.get('wordpressdeploy')['options'];
    var target       = grunt.option('target') || task_options['target'];

    if ( typeof target === "undefined" || typeof grunt.config.get('wordpressdeploy')[target] === "undefined")  {
      grunt.fail.warn("Invalid target provided. I cannot push files from nowhere! Please checked your configuration and provide a valid target.", 6);
    }

    // Grab the options
    var target_options      = grunt.config.get('wordpressdeploy')[target];
    var local_options       = grunt.config.get('wordpressdeploy').local;
    var rsync_args = util.compose_rsync_options(task_options.rsync_args);
    var exclusions = util.compose_rsync_exclusions(task_options.exclusions);

    var local_path = util.get_path( local_options, grunt );
    var target_path = util.get_path( target_options, grunt );

    var config = {
      rsync_args: rsync_args,
      ssh_host: target_options.ssh_host,
      from: target_path,
      to: local_path,
      exclusions: exclusions
    };

    util.rsync_pull(config);
  });

  // Pull Specified Theme Files from remote host ( Shortcut for pull_files --path-key=theme )
  grunt.registerTask("pull_theme", "Pull Specified Theme Files from remote host with rsync.", function () {
    grunt.option('path-key', 'theme');
    grunt.task.run("pull_files");
  });

  // Push Specified Theme Files to remote host ( Shortcut for push_files --path-key=theme )
  grunt.registerTask("push_theme", "Push Specified Theme Files to remote host with rsync.", function () {
    grunt.option('path-key', 'theme');
    grunt.task.run("push_files");
  });

  // Pull Entire Plugin Folder from remote host ( Shortcut for pull_files --path-key=plugins )
  grunt.registerTask("pull_plugins", "Pull Entire Plugin Folder from remote host with rsync.", function () {
    grunt.option('path-key', 'plugins');
    grunt.task.run("pull_files");
  });

  // Push Entire Plugin Folder to remote host ( Shortcut for push_files --path-key=plugins )
  grunt.registerTask("push_plugins", "Push plugin files to a remote host with rsync.", function () {
    grunt.option('path-key', 'plugins');
    grunt.task.run("push_files");
  });

  // Push Local Plugin to remote host (Single Plugin folder). Useful for plugin development workflow
  // ( Shortcut for push_files --path-key=plugin )
  grunt.registerTask("push_plugin", "Push single plugin folder to a remote host with rsync.", function () {
    grunt.option('path-key', 'plugin');
    grunt.task.run("push_files");
  });

  // Pull All Uploads from remote host ( Shortcut for pull_files --path-key=uploads )
  grunt.registerTask("pull_uploads", "Pull uploaded files from a remote host with rsync.", function () {
    grunt.option('path-key', 'uploads');
    grunt.task.run("pull_files");
  });

  // Pull All Uploads to remote host ( Shortcut for push_files --path-key=uploads )
  grunt.registerTask("push_uploads", "Push uploaded files to a remote host with rsync.", function () {
    grunt.option('path-key', 'uploads');
    grunt.task.run("push_files");
  });


};
