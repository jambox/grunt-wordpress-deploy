"use strict"

exports.init = (grunt) ->
  shell = require("shelljs")
  lineReader = require("line-reader")
  exports = {}

  exports.db_dump = (config, output_paths) ->
    grunt.file.mkdir output_paths.dir
    cmd = exports.mysqldump_cmd(config)
    grunt.log.oklns "dump command: " + cmd
    output = shell.exec(cmd,
      silent: true
    ).output
    grunt.file.write output_paths.file, output
    grunt.log.oklns "Database DUMP succesfully exported to: " + output_paths.file
    return

  
  #==========  Caliper mods  ==========
  
  exports.db_dump_ess = (config, output_paths) ->
    grunt.file.mkdir output_paths.dir
    return  unless config.table_prefix
    prefix_matches = exports.all_table_prefix_matches(config)
    grunt.log.oklns "Prefix matches from '" + config.table_prefix + "'"
    console.log prefix_matches
    tables_to_dump = exports.tables_to_dump(config, prefix_matches)
    grunt.log.oklns "Tables to dump"
    console.log tables_to_dump
    prefixed_sqldump = exports.prefixed_sqldump(config, tables_to_dump)
    grunt.file.write output_paths.file, prefixed_sqldump
    grunt.log.oklns "Database DUMP for '" + config.table_prefix + "' succesfully exported to: " + output_paths.file
    return

  
  # Find all table prefix that match the config.table_prefix
  # (i.e. the prefix 'wp_' could match 'wp_', 'wp_backup_', etc.)  
  exports.all_table_prefix_matches = (config) ->
    table_prefix = config.table_prefix or "wp_"
    prefix_match_tpls =
      sql: "-e SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = \"<%= database %>\" AND TABLE_NAME LIKE \"<%= table_prefix %>%posts\";"
      prefix_matches_cmd: "<%= sql_connect %> '<%= tables_sql %>' | grep -v -e TABLE_NAME | sed -e 's/posts//g' | xargs "

    
    # var works_in_shell = "mysql wordpress -u admin --password=admin -e 'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = \"wordpress\" AND TABLE_NAME LIKE \"wp_%posts\";' | grep -v -e TABLE_NAME | sed -e 's/posts//g'";
    # console.log( shell.exec( works_in_shell ).output ); return false;
    sql_connect = grunt.template.process(tpls.sql_connect,
      data:
        user: config.user
        pass: config.pass
        database: config.database
    )
    tables_sql = grunt.template.process(prefix_match_tpls.sql,
      data:
        database: config.database
        table_prefix: table_prefix
    )
    
    # grunt.log.writeln('tables sql');
    # console.log(tables_sql);
    prefix_matches_cmd = grunt.template.process(prefix_match_tpls.prefix_matches_cmd,
      data:
        sql_connect: sql_connect
        tables_sql: tables_sql
    )
    
    # console.log('cmd \n' + prefix_matches_cmd);
    prefix_matches = shell.exec(prefix_matches_cmd,
      silent: true
    ).output.replace(/(\r\n|\n|\r)/g, "")
    
    # console.log('matches [' + prefix_matches +']');
    prefix_matches.split " "

  
  # Return Array of tables to dump
  # Builds a SQL statement that SELECTS table_names
  #        LIKE '<%= config.table_prefix_ =>%'
  #        and NOT LIKE '<%= other_matched_prefixes %>_'
  exports.tables_to_dump = (config, prefix_matches) ->
    prefix_tpls =
      sql: "-e SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = \"<%= database %>\" <%= comparison %>;"
      like: " AND TABLE_NAME LIKE \"<%= match %>%\""
      not_like: " AND TABLE_NAME NOT LIKE \"<%= match %>%\""
      cmd: "<%= sql_connect %> '<%= sql %>' | grep -v -e TABLE_NAME | xargs "

    sql_connect = grunt.template.process(tpls.sql_connect,
      data:
        user: config.user
        pass: config.pass
        database: config.database
    )
    comparison = ""
    i = 0

    while i < prefix_matches.length
      match = prefix_matches[i]
      continue  unless match
      if match is config.table_prefix
        comparison += grunt.template.process(prefix_tpls.like,
          data:
            match: match
        )
      
      # comparison += " AND TABLE_NAME LIKE '" + match + "%'";
      else
        comparison += grunt.template.process(prefix_tpls.not_like,
          data:
            match: match
        )
      i++
    
    # comparison += " AND TABLE_NAME NOT LIKE '" + match + "%'";
    sql = grunt.template.process(prefix_tpls.sql,
      data:
        database: config.database
        comparison: comparison
    )
    cmd = grunt.template.process(prefix_tpls.cmd,
      data:
        sql_connect: sql_connect
        sql: sql
    )
    
    # Make sure you strip the new line chars
    tables_to_dump = shell.exec(cmd,
      silent: true
    ).output.replace(/(\r\n|\n|\r)/g, "")
    tables_to_dump.split " "

  
  # Run the mysqldump cmd and append the table names from exports.tables_to_dump() fn
  exports.prefixed_sqldump = (config, tables_to_dump) ->
    return false  unless tables_to_dump
    cmd = exports.mysqldump_cmd(config)
    cmd += " " + tables_to_dump.join(" ")
    dump_output = shell.exec(cmd,
      silent: true
    ).output
    dump_output

  
  #==========  Caliper mods  ==========
  exports.db_import = (config, src) ->
    shell.exec exports.mysql_cmd(config, src)
    grunt.log.oklns "Database imported succesfully"
    return

  exports.rsync_push = (config) ->
    grunt.log.oklns "Syncing data from '" + config.from + "' to '" + config.to + "' with rsync."
    cmd = exports.rsync_push_cmd(config)
    grunt.log.writeln cmd
    shell.exec cmd
    grunt.log.oklns "Sync completed successfully."
    return

  exports.rsync_pull = (config) ->
    grunt.log.oklns "Syncing data from '" + config.from + "' to '" + config.to + "' with rsync."
    cmd = exports.rsync_pull_cmd(config)
    shell.exec cmd
    grunt.log.oklns "Sync completed successfully."
    return

  exports.generate_backup_paths = (target, task_options) ->
    backups_dir = task_options.backups_dir or "backups"
    directory = grunt.template.process(tpls.backup_path,
      data:
        backups_dir: backups_dir
        env: target
        date: grunt.template.today("yyyymmdd")
        time: grunt.template.today("HH-MM-ss")
    )
    filepath = directory + "/db_backup.sql"
    dir: directory
    file: filepath

  exports.compose_rsync_options = (options) ->
    args = options.join(" ")
    args

  exports.compose_rsync_exclusions = (options) ->
    exclusions = ""
    i = 0
    i = 0
    while i < options.length
      exclusions += "--exclude '" + options[i] + "' "
      i++
    exclusions = exclusions.trim()
    exclusions

  exports.db_adapt = (old_url, new_url, file) ->
    grunt.log.oklns "Adapt the database: set the correct urls for the destination in the database."
    content = grunt.file.read(file)
    output = exports.replace_urls(old_url, new_url, content)
    grunt.file.write file, output
    return

  exports.replace_urls = (search, replace, content) ->
    content = exports.replace_urls_in_serialized(search, replace, content)
    content = exports.replace_urls_in_string(search, replace, content)
    content

  exports.replace_urls_in_serialized = (search, replace, string) ->
    length_delta = search.length - replace.length
    
    # Replace for serialized data
    matches = undefined
    length = undefined
    delimiter = undefined
    old_serialized_data = undefined
    target_string = undefined
    new_url = undefined
    regexp = /s:(\d+):([\\]*['"])(.*?)\2;/g
    matches = regexp.exec(string)
    while matches
      old_serialized_data = matches[0]
      target_string = matches[3]
      
      # If the string contains the url make the substitution
      if target_string.indexOf(search) isnt -1
        length = matches[1]
        delimiter = matches[2]
        
        # Replace the url
        new_url = target_string.replace(search, replace)
        length -= length_delta
        
        # Compose the new serialized data
        new_serialized_data = "s:" + length + ":" + delimiter + new_url + delimiter + ";"
        
        # Replace the new serialized data into the dump
        string = string.replace(old_serialized_data, new_serialized_data)
    string

  exports.replace_urls_in_string = (search, replace, string) ->
    regexp = new RegExp("(?!" + replace + ")(" + search + ")", "g")
    string.replace regexp, replace

  
  # Commands generators 
  exports.mysqldump_cmd = (config) ->
    cmd = grunt.template.process(tpls.mysqldump,
      data:
        user: config.user
        pass: config.pass
        database: config.database
        host: config.host
    )
    if typeof config.ssh_host is "undefined"
      grunt.log.oklns "Creating DUMP of local database [" + config.database + "]"
    else
      grunt.log.oklns "Creating DUMP of remote database"
      tpl_ssh = grunt.template.process(tpls.ssh,
        data:
          host: config.ssh_host
      )
      cmd = tpl_ssh + " '" + cmd + "'"
    cmd

  exports.mysql_cmd = (config, src) ->
    cmd = grunt.template.process(tpls.mysql,
      data:
        host: config.host
        user: config.user
        pass: config.pass
        database: config.database
        path: src
    )
    if typeof config.ssh_host is "undefined"
      grunt.log.oklns "Importing DUMP into local database"
      cmd = cmd + " < " + src
      console.log cmd
    else
      tpl_ssh = grunt.template.process(tpls.ssh,
        data:
          host: config.ssh_host
      )
      grunt.log.oklns "Importing DUMP into remote database"
      cmd = tpl_ssh + " '" + cmd + "' < " + src
    cmd

  exports.rsync_push_cmd = (config) ->
    cmd = grunt.template.process(tpls.rsync_push,
      data:
        rsync_args: config.rsync_args
        ssh_host: config.ssh_host
        from: config.from
        to: config.to
        exclusions: config.exclusions
    )
    cmd

  exports.rsync_pull_cmd = (config) ->
    cmd = grunt.template.process(tpls.rsync_pull,
      data:
        rsync_args: config.rsync_args
        ssh_host: config.ssh_host
        from: config.from
        to: config.to
        exclusions: config.exclusions
    )
    cmd

  tpls =
    backup_path: "<%= backups_dir %>/<%= env %>/<%= date %>/<%= time %>"
    mysqldump: "mysqldump -h <%= host %> -u<%= user %> -p<%= pass %> <%= database %>"
    mysql: "mysql -h <%= host %> -u <%= user %> -p<%= pass %> <%= database %>"
    sql_connect: "mysql <%= database %> -u <%= user %> --password=<%= pass %>"
    rsync_push: "rsync <%= rsync_args %> --delete -e 'ssh <%= ssh_host %>' <%= exclusions %> <%= from %> :<%= to %>"
    rsync_pull: "rsync <%= rsync_args %> -e 'ssh <%= ssh_host %>' <%= exclusions %> :<%= from %> <%= to %>"
    ssh: "ssh <%= host %>"

  exports