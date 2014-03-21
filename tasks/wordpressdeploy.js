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
var pizza_util  = require('../tasks/lib/pd-util.js').init(grunt);

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

    // Dump local DB
    util.db_dump(local_options, local_backup_paths);

    // Search and Replace database refs
    util.db_adapt(local_options, target_options, local_backup_paths.file, dest_backup_paths.file);

    // Dump target DB
    util.db_dump(target_options, target_backup_paths);

    // Import dump to target DB
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

  grunt.registerTask("pd_migrate", "Remote pull_db followed by pd_adapt.", function () {

    /*==========  Pull DB  ==========*/
    
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
    var migrated_backup_paths  = util.generate_backup_paths("pd-migrated", task_options);

    grunt.option( 'migrated_backup_paths', migrated_backup_paths );

    // Start execution
    grunt.log.subhead("Pulling database from '" + target_options.title + "' into Local");

    // Dump Target DB
    util.db_dump(target_options, target_backup_paths);

    // grunt.log.subhead("Adapting sqldump to target");
    // util.db_adapt(target_options,local_options,target_backup_paths.file);

    // Start execution of PD Tools Adapt
    util.pd_tools_adapt(
      migrated_backup_paths,
      target_backup_paths,
      target_options,
      local_options,
      grunt
    );

    // Backup Local DB
    util.db_dump(local_options, local_backup_paths);

    grunt.log.subhead("Migration Complete");

    // Import dump into Local
    // util.db_import(local_options,migrated_backup_paths.file);
    grunt.task.run('import_migrated_db');

    grunt.task.run('acf_import');

    grunt.task.run('pd_wp_cli');

    // grunt.task.run('convert_pd_data'); // Need to figure out how to require plugins from within wp cli

  });

  grunt.registerTask("import_migrated_db", "Import migrated db into local db.", function () {

    grunt.log.subhead("Running PD Import DB");

    var task_options = grunt.config.get('wordpressdeploy')['options'];
    var target       = grunt.option('target') || task_options['target'];

    if ( typeof target === "undefined" || typeof grunt.config.get('wordpressdeploy')[target] === "undefined")  {
      grunt.fail.warn("Invalid target provided. I cannot pull a database from nowhere! Please checked your configuration and provide a valid target.", 6);
    }

    // Grab the options
    var target_options      = grunt.config.get('wordpressdeploy')[target];
    var local_options       = grunt.config.get('wordpressdeploy').local;

    var migrated_backup_paths = grunt.option('migrated_backup_paths');

    grunt.log.subhead("Importing DB");

    util.db_import( local_options, migrated_backup_paths.file );

  });

  grunt.registerTask("acf_import", "Import all ACFs using acf-wp-cli.", function () {

    grunt.log.subhead("Importing all ACFs");
    pizza_util.acf_import();
    grunt.log.ok();

  });

  grunt.registerTask("pd_wp_cli", "pd wp cli stuff.", function () {

    grunt.log.subhead("Running wp cli stuff");
    util.pd_wp_cli();
    grunt.log.ok();

  });



  grunt.registerTask("convert_pd_data", "Convert PD Tools OG data to the new jams.", function () {

    grunt.log.subhead("Converting Data");
    pizza_util.convert_data();
    grunt.log.oklns('Data conversion complete');

  });


};
