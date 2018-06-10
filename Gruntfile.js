module.exports = function(grunt) {

  grunt.initConfig({
    responsive_images: {
      dev: {
        options: {
          sizes: [{
            width: '200px',
            suffix: '_small',
            quality: 20
          },{
            width: '400px',
            suffix: '_mid',
            quality: 50
          },{
            width: '100%',
            suffix: '_big',
            quality: 90
          }]
        },
        files: [{
          expand: true,
          src: ['*.{gif,jpg,png}'],
          cwd: 'img/',
          dest: 'images/'
        }]
      }
    },
  });

  grunt.loadNpmTasks('grunt-responsive-images');
  grunt.registerTask('default', ['responsive_images']);

};