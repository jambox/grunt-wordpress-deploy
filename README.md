# Grunt Wordpress Deployment

Deploy a Wordpress instance without pain using Grunt.

This plugin leverages Grunt.js to push and pull a Wordpress instance into predefined locations.
Here's are some of the features:

* Multiple environments support: you can define different environments such as `development`, `staging`, `production` and so on, with different access credentials, paths and domains.
* Adapt the Wordpress database to the destination domain: It replaces all the instances of the source environment domain with the destination environment domain, even into serialized data.
* Push and pull files with rsync.
* Completely based on Javascript, requires only a few common system tools to perform the tasks (`mysql`, `mysqldump`, `ssh`).

## Requirements

This plugin requires:

* Grunt `~0.4.1`
* `ssh`
* `rsync`
* `mysqldump`

To be able to use this plugin it's important to have access to the remote machine through `ssh`, with ssh key authentication to avoid password entering during the tasks. As this is a different topic we will not cover it here but you might like to start by reading [Github's own advice](https://help.github.com/articles/generating-ssh-keys).

## Getting started

This is a [Grunt](http://gruntjs.com/) plugin, so it requires Grunt. It's really easy to install, as explained into the [Getting Started](http://gruntjs.com/getting-started) guide. Please read the guide to understand how it works.

When Grunt is installed on your machine, you can install this plugin with the following command:

```shell
npm install git+https://github.com/jambox/grunt-wordpress-deploy --save-dev
```

*@TODO : add this repo to npm instead of using github install*

Once the plugin has been installed, it may be enabled and configured into your Gruntfile.coffee (or Gruntfile.js). Please follow the example Gruntfile (`grunt/wordpressdeploy.coffee`) to configure your environments.

```coffee

module.exports =
  options:
    # backups_dir: "backups"
    rsync_args: [
      "--verbose"
      "--progress"
      "-rlpt"
      "--compress"
      "--omit-dir-times"
      # "--delete"
      # "--dry-run"
    ]
    exclusions: [
      "Gruntfile.*"
      ".git/"
      "tmp/*"
      "backups/"
      "wp-config.php"
      "composer.json"
      "composer.lock"
      "README.md"
      ".gitignore"
      "package.json"
      "node_modules"
      ".DS_Store"
      "sftp-config.json"
      "codekit-config.json"
      "config.codekit"
      # Commented out for pushing plugins/themes that compile LESS at runtime
      # "*.less"
      "backwpup-*"
      "grunt"
      "vendor"
      "*.coffee"
      "deployconfig.*"
      ".codekit-cache/" # Proprietary file from Codekit     
      # Grunt Build
      "releases/"
      "build/"
      # For Use with Roots Theme Setup
      "assets/less/"
      "assets/js/plugins"
      ".editorconfig" 
      ".bowerrc" 
      "bower.json"       
      # Theme-specific Exclusions
      "_Project Images/"
    ]

  local:
    title: "Local"
    database: "wordpress"
    table_prefix: "wp_"
    table_exclusions : [
    ]
    user: "admin"
    pass: "admin"
    host: "localhost"
    url: "//localhost:8888/best-client-ev.er"
    path:
      theme   : "<%= grunt.config.data.deployconfig.local.wp_content_path %>/themes/<%= grunt.config.data.theme_name %>/build/"
      uploads : "<%= grunt.config.data.deployconfig.local.wp_content_path %>/uploads/"
      plugins : "<%= grunt.config.data.deployconfig.local.wp_content_path %>/plugins/"


  # ==========  Start Environment Definitions  ==========


  dev:
    title: "Dev Site"
    database: "client_dev"
    table_prefix: "wp_"
    table_exclusions : [
      "_wf" # Will exclude with " NOT LIKE '%_wf%' " SQL statement
    ]        
    user: "<%= grunt.config.data.deployconfig.dev.db_user %>"
    pass: "<%= grunt.config.data.deployconfig.dev.db_pass %>"
    host: "127.0.0.1"
    url: "//dev.best-client-ev.er"
    path:
      theme   : "<%= grunt.config.data.deployconfig.dev.wp_content_path %>/themes/<%= grunt.config.data.theme_name %>/"
      uploads : "<%= grunt.config.data.deployconfig.dev.wp_content_path %>/uploads/"
      plugins : "<%= grunt.config.data.deployconfig.dev.wp_content_path %>/plugins/"
    ssh_host: "dev_user@ssh.best-client-ev.er"

  production:
    title: "Production Site"
    database: "client_wp"
    table_prefix: "wp_"
    table_exclusions : []        
    user: "<%= grunt.config.data.deployconfig.production.db_user %>"
    pass: "<%= grunt.config.data.deployconfig.production.db_pass %>"
    host: "127.0.0.1"
    url: "//best-client-ev.er"
    sql_remove: [
      "Warning: Using a password on the command line interface can be insecure."
    ]    
    path:
      theme   : "<%= grunt.config.data.deployconfig.production.wp_content_path %>/themes/<%= grunt.config.data.theme_name %>/"
      uploads : "<%= grunt.config.data.deployconfig.production.wp_content_path %>/uploads/"
      plugins : "<%= grunt.config.data.deployconfig.production.wp_content_path %>/plugins/"
    ssh_host: "main_user@ssh.best-client-ev.er"
  your_environment {
    ...
  }
```

In the example above we define two environments, one is mandatory and is always called `local`, but the others can be defined in any way you want. In this case we've added two more environments called `dev` and `production`.

## Available tasks

The plugin defines a serie of tasks. Here's a brief overview:

* `grunt push_db --target=environment_name [--sql-src=PATH_TO_SQL_DUMP]`: Push the local database to the specified environment.
* `grunt pull_db --target=environment_name`: Pull the database on the specified environment into the local environment.
* `grunt push_files --target=environment_name --path-key=specified_path`: Push the local files to the specified environment, using rsync. The `path-key` should be specified as a key in the `path` object in your grunt task config.
* `grunt pull_files --target=environment_name --path-key=specified_path`: Pull the files from the specified environment to the local environment, using rsync.The `path-key` should be specified as a key in the `path` object in your grunt task config.

**Shortcuts**

- `grunt pull_theme` ( Shortcut for `pull_files --path-key=theme` )
    - Pull Specified Theme Files from remote host.

- `grunt push_theme` ( Shortcut for `push_files --path-key=theme` )
    - Push Specified Theme Files to remote host.

- `grunt pull_plugins` ( Shortcut for `pull_files --path-key=plugins` )
    - Pull Entire Plugin Folder from remote host.

- `grunt push_plugins` ( Shortcut for `push_files --path-key=plugins` )
    - Push Entire Plugin Folder to remote host.

- `grunt push_plugin` ( Shortcut for `push_files --path-key=plugin` )
    - Push Local Plugin to remote host (Single Plugin folder). Useful for plugin development workflow.

- `grunt pull_uploads` ( Shortcut for `pull_files --path-key=uploads` ).
    - Pull All Uploads from remost host.

- `grunt push_uploads` ( Shortcut for `push_files --path-key=uploads` )
    - Pull All Uploads to remote host.


### Push_db

Example execution: `grunt push_db --target=dev [--sql-src=backups/wp-migratedb/manual-sql-dump.sql]`

The `push_db` command moves your local database to a remote database location, specified by the target environment. What happens under the hood is the following:

- Dump the local database
- Adapt the local dump to the remote environment executing a search and replace to change the instances of the local domain with the instances of the remote domain, taking care of serialized data
- Backups the database on the target environment
- Imports the local adapted dump into the remote database
- _Optional_ : If you specify the `--sql-src` flag, the remote DB will import that file


### Pull_db

Example execution: `grunt pull_db --target=dev`

The `pull_db` command moves your target environment database to the local database. What happens under the hood is the following:

- Dump the remote database
- Adapt the remote dump to the local environment executing a search and replace to change the instances of the remote domain with the instances of the local domain, taking care of serialized data
- Backups the database on the local environment
- Imports the remote adapted dump into the local database

### Push_files

Example execution: `grunt push_files --target=dev --path-key=theme`

The `push_files` command moves your local environment files to the target environment using rsync.

This operation is not reversible.


### Pull_files

Example execution: `grunt pull_files --target=dev --path-key=uploads`

The `pull_files` command moves your target environment files to the local environment using rsync.

This operation is not reversible.


### Configuration

Each target expects an options object to be provided to allow the tasks to function correctly. They're outlined below:


#### title
Type: `String`

Description: A proper case name for the target. Used to describe the target to humans in console output while the task is running.


#### database
Type: `String`

Description: The name of the database for this target.


#### table_prefix
Type: `String`

Description: The WordPress table prefix being used by this site. If you're using a single table to run multiple WP sites, this option will ensure only a single site's data is being pushed, pulled and/or backed up.


#### table_exclusions
Type: `Array`

Description : Sometimes WordPress plugins used for cacheing and/or analytics create additional tables in the db. If you do not want the `mysqldump` to target these tables, exclude theme here. For example, excluding WordFence security data:

```coffee
 table_exclusions : [
    "_wf" # Will exclude with " NOT LIKE '%_wf%' " SQL statement
  ] 
```


#### user
Type: `String`

_To allow git tracking, this value is stored in the `deployconfig.js` object and pulled in at runtime._

Description: the database user with permissions to access and modify the database


#### pass
Type: `String`

_To allow git tracking, this value is stored in the `deployconfig.js` object and pulled in at runtime._

Description: the password for the database user (above)


#### host
Type: `String`

Description: the hostname for the location in which the database resides.


#### port (Optional)
Type: `Number`

Description: the port for which mysql runs on. Leave out for the default `3306`


#### url
Type: `String`

Description: the string to search and replace within the database before it is moved to the target location. This is designed for use with the awful Wordpress implementation which stores  [the site url into the database](http://codex.wordpress.org/Changing_The_Site_URL) and is required to be updated upon migration to a new environment.


#### path
Type: `Object`

Description: An object of pairs to specify which path in the file structure rsync should target. Used by rsync to update the correct folder on synchronization.

_NOTE_: Each environment in the `Gruntfile` should have matching path keys. For example, if you specify a `theme` path for your local environment, make sure you have a `theme` path for your `dev` and `production` environments too.


#### ssh_host
Type: `String`

Description: ssh connection string in the format `SSH_USER@SSH_HOST`. The task assumes you have ssh keys setup which allow you to remote into your server without requiring the input of a password.

### Options


#### options.backups_dir
Type: `String`

Default value: `backups`

A string value that represents the directory path (*relative* to your Grunt file) to which you want your database backups for source and target to be saved prior to modifications.

You may wish to have your backups reside outside the current working directory of your Gruntfile. In which case simply provide the relative path eg: ````../../backups````.


#### options.rsync_args
Type: `Array`

Default value: `["--verbose", "--progress", "-rlpt", "--compress", "--omit-dir-times"]`

An array representing all parameters passed to the rsync command in order to perform the synchronization operation. The defult value in this example is fine for common usages of this plugin.



#### options.exclusions
Type: `Array`

Default value: _See the [Getting Started section](#getting-started) for default values._

An array representing all excluded files and directories from the synchronization process.


## History

This plugin is an augmented version of the [grunt-wordpress-deploy](https://github.com/webrain/grunt-wordpress-deploy) package, which is "an almost complete rewrite of the [Grunt-Deployments Plugin](https://github.com/getdave/grunt-deployments)".

Credits to the original developers (@webrain and @getdave) for their work.

