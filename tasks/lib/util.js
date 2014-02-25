'use strict';

exports.init = function (grunt) {
  var shell = require('shelljs');
  var lineReader = require("line-reader");

  var exports = {};

  exports.db_dump = function(config, output_paths) {
    grunt.file.mkdir(output_paths.dir);

    var cmd = exports.mysqldump_cmd(config);

    grunt.log.oklns("dump command: " + cmd);

    var output = shell.exec(cmd, {silent: true}).output;

    grunt.file.write(output_paths.file, output);
    grunt.log.oklns("Database DUMP succesfully exported to: " + output_paths.file);
  };

  /*==========  Caliper mods  ==========*/
  

  exports.db_dump_ess = function(config, output_paths) {
    grunt.file.mkdir(output_paths.dir);

    var prefix_matches = exports.all_table_prefix_matches(config);

    grunt.log.oklns("prefix matches");
    console.log(prefix_matches);

    var tables_to_dump = exports.tables_to_dump(config, prefix_matches);
    grunt.log.oklns("tables to dump");
    console.log( tables_to_dump );

    var prefixed_sqldump = exports.prefixed_sqldump(config, tables_to_dump);

    grunt.file.write(output_paths.file, prefixed_sqldump);
    grunt.log.oklns("Database DUMP for '" + config.table_prefix + "' succesfully exported to: " + output_paths.file);
  };

  exports.all_table_prefix_matches = function( config ){
    var table_prefix = config.table_prefix || 'wp_';

    var prefix_match_tpls = {
      sql : '-e SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "<%= database %>" AND TABLE_NAME LIKE "<%= table_prefix %>%posts";',
      prefix_matches_cmd : "<%= sql_connect %> '<%= tables_sql %>' | grep -v -e TABLE_NAME | sed -e 's/posts//g' | xargs "
    }

    // var works_in_shell = "mysql wordpress -u admin --password=admin -e 'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = \"wordpress\" AND TABLE_NAME LIKE \"wp_%posts\";' | grep -v -e TABLE_NAME | sed -e 's/posts//g'";
    // console.log( shell.exec( works_in_shell ).output ); return false;

    var sql_connect = grunt.template.process(tpls.sql_connect, {
      data: {
        user: config.user,
        pass: config.pass,
        database: config.database
      }
    });

    var tables_sql = grunt.template.process(prefix_match_tpls.sql, {
      data: {
        database: config.database,
        table_prefix: table_prefix
      }
    });
    // grunt.log.writeln('tables sql');
    // console.log(tables_sql);
    
    var prefix_matches_cmd = grunt.template.process(prefix_match_tpls.prefix_matches_cmd, {
      data: {
        sql_connect: sql_connect,
        tables_sql: tables_sql
      }
    });

    // console.log('cmd \n' + prefix_matches_cmd);
    var prefix_matches = shell.exec( prefix_matches_cmd, { silent: true } ).output.replace(/(\r\n|\n|\r)/gm,'');
    // console.log('matches [' + prefix_matches +']');

    return prefix_matches.split(' ');

  };

  exports.tables_to_dump = function(config, prefix_matches) {

    var prefix_tpls = {
      sql : '-e SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = "<%= database %>" <%= comparison %>;',
      like : ' AND TABLE_NAME LIKE "<%= match %>%"',
      not_like : ' AND TABLE_NAME NOT LIKE "<%= match %>%"',
      cmd : "<%= sql_connect %> '<%= sql %>' | grep -v -e TABLE_NAME | sed -e 's/posts//g' | xargs ",
    };

    var sql_connect = grunt.template.process(tpls.sql_connect, {
      data: {
        user: config.user,
        pass: config.pass,
        database: config.database
      }
    });

    var comparison = '';
    for ( var i = 0; i < prefix_matches.length; i++ ) {
      var match = prefix_matches[i];

      if( !match ) {
        continue;
      }

      if ( match == config.table_prefix ) {
        comparison += grunt.template.process(prefix_tpls.like, { data: { match:match } } );        
        // comparison += " AND TABLE_NAME LIKE '" + match + "%'";
      } else {
        comparison += grunt.template.process(prefix_tpls.not_like, { data: { match:match } } );        
        // comparison += " AND TABLE_NAME NOT LIKE '" + match + "%'";
      }
    }

    var sql = grunt.template.process(prefix_tpls.sql, {
      data: {
        database: config.database,
        comparison: comparison
      }
    });

    var cmd = grunt.template.process(prefix_tpls.cmd, {
      data: {
        sql_connect: sql_connect,
        sql: sql
      }
    });

    // Make sure you strip the new line chars
    console.log('cmd');
    console.log(cmd);
    var tables_to_dump = shell.exec( cmd, { silent: true } ).output.replace(/(\r\n|\n|\r)/gm,'');

    return tables_to_dump.split(' ');

  };

  exports.prefixed_sqldump = function(config, tables_to_dump){
    if(!tables_to_dump) {
      return false;
    }

    var cmd = exports.mysqldump_cmd(config);

    cmd += ' ' + tables_to_dump.join(' ');

    var dump_output = shell.exec( cmd, { silent: true } ).output;

    return dump_output;
  };


  /*==========  Caliper mods  ==========*/


  exports.db_import = function(config, src) {
    shell.exec(exports.mysql_cmd(config, src));
    grunt.log.oklns("Database imported succesfully");
  };

  exports.rsync_push = function(config) {
    grunt.log.oklns("Syncing data from '" + config.from + "' to '" + config.to + "' with rsync.");

    var cmd = exports.rsync_push_cmd(config);
    grunt.log.writeln(cmd);

    shell.exec(cmd);

    grunt.log.oklns("Sync completed successfully.");
  };

  exports.rsync_pull = function(config) {
    grunt.log.oklns("Syncing data from '" + config.from + "' to '" + config.to + "' with rsync.");

    var cmd = exports.rsync_pull_cmd(config);
    shell.exec(cmd);

    grunt.log.oklns("Sync completed successfully.");
  };

  exports.generate_backup_paths = function(target, task_options) {

    var backups_dir = task_options['backups_dir'] || "backups";

    var directory = grunt.template.process(tpls.backup_path, {
      data: {
        backups_dir: backups_dir,
        env: target,
        date: grunt.template.today('yyyymmdd'),
        time: grunt.template.today('HH-MM-ss'),
      }
    });

    var filepath = directory + '/db_backup.sql';

    return {
      dir: directory,
      file: filepath
    };
  };

  exports.compose_rsync_options = function(options) {
    var args = options.join(' ');

    return args;
  };

  exports.compose_rsync_exclusions = function(options) {
    var exclusions = '';
    var i = 0;

    for(i = 0;i < options.length; i++) {
      exclusions += "--exclude '" + options[i] + "' ";
    }

    exclusions = exclusions.trim();

    return exclusions;
  };

  exports.db_adapt = function(old_url, new_url, file) {
    grunt.log.oklns("Adapt the database: set the correct urls for the destination in the database.");
    var content = grunt.file.read(file);

    var output = exports.replace_urls(old_url, new_url, content);

    grunt.file.write(file, output);
  };

  exports.replace_urls = function(search, replace, content) {
    content = exports.replace_urls_in_serialized(search, replace, content);
    content = exports.replace_urls_in_string(search, replace, content);

    return content;
  };

  exports.replace_urls_in_serialized = function(search, replace, string) {
    var length_delta = search.length - replace.length;

    // Replace for serialized data
    var matches, length, delimiter, old_serialized_data, target_string, new_url;
    var regexp = /s:(\d+):([\\]*['"])(.*?)\2;/g;

    while (matches = regexp.exec(string)) {
      old_serialized_data = matches[0];
      target_string = matches[3];

      // If the string contains the url make the substitution
      if (target_string.indexOf(search) !== -1) {
        length = matches[1];
        delimiter = matches[2];

        // Replace the url
        new_url = target_string.replace(search, replace);
        length -= length_delta;

        // Compose the new serialized data
        var new_serialized_data = 's:' + length + ':' + delimiter + new_url + delimiter + ';';

        // Replace the new serialized data into the dump
        string = string.replace(old_serialized_data, new_serialized_data);
      }
    }

    return string;
  };

  exports.replace_urls_in_string = function (search, replace, string) {
    var regexp = new RegExp('(?!' + replace + ')(' + search + ')', 'g');
    return string.replace(regexp, replace);
  };

  /* Commands generators */
  exports.mysqldump_cmd = function(config) {
    var cmd = grunt.template.process(tpls.mysqldump, {
      data: {
        user: config.user,
        pass: config.pass,
        database: config.database,
        host: config.host
      }
    });

    if (typeof config.ssh_host === "undefined") {
      grunt.log.oklns("Creating DUMP of local database [" + config.database + "]");
    } else {
      grunt.log.oklns("Creating DUMP of remote database");
      var tpl_ssh = grunt.template.process(tpls.ssh, {
        data: {
          host: config.ssh_host
        }
      });
      cmd = tpl_ssh + " '" + cmd + "'";
    }
    return cmd;
  };

  exports.mysql_cmd = function(config, src) {
    var cmd = grunt.template.process(tpls.mysql, {
      data: {
        host: config.host,
        user: config.user,
        pass: config.pass,
        database: config.database,
        path: src
      }
    });

    if (typeof config.ssh_host === "undefined") {
      grunt.log.oklns("Importing DUMP into local database");
      cmd = cmd + " < " + src;
      console.log( cmd );
    } else {
      var tpl_ssh = grunt.template.process(tpls.ssh, {
        data: {
          host: config.ssh_host
        }
      });

      grunt.log.oklns("Importing DUMP into remote database");
      cmd = tpl_ssh + " '" + cmd + "' < " + src;
    }

    return cmd;
  };

  exports.rsync_push_cmd = function(config) {
    var cmd = grunt.template.process(tpls.rsync_push, {
      data: {
        rsync_args: config.rsync_args,
        ssh_host: config.ssh_host,
        from: config.from,
        to: config.to,
        exclusions: config.exclusions
      }
    });

    return cmd;
  };

  exports.rsync_pull_cmd = function(config) {
    var cmd = grunt.template.process(tpls.rsync_pull, {
      data: {
        rsync_args: config.rsync_args,
        ssh_host: config.ssh_host,
        from: config.from,
        to: config.to,
        exclusions: config.exclusions
      }
    });

    return cmd;
  };

  var tpls = {
    backup_path: "<%= backups_dir %>/<%= env %>/<%= date %>/<%= time %>",
    mysqldump: "mysqldump -h <%= host %> -u<%= user %> -p<%= pass %> <%= database %>",
    mysql: "mysql -h <%= host %> -u <%= user %> -p<%= pass %> <%= database %>",
    sql_connect : "mysql <%= database %> -u <%= user %> --password=<%= pass %>",
    rsync_push: "rsync <%= rsync_args %> --delete -e 'ssh <%= ssh_host %>' <%= exclusions %> <%= from %> :<%= to %>",
    rsync_pull: "rsync <%= rsync_args %> -e 'ssh <%= ssh_host %>' <%= exclusions %> :<%= from %> <%= to %>",
    ssh: "ssh <%= host %>",
  };




  return exports;
};
