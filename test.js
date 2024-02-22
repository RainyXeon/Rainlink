const youtubeRegex = /(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be.com\/\S*(?:watch|embed)(?:(?:(?=\/[-a-zA-Z0-9_]{11,}(?!\S))\/)|(?:\S*v=|v\/)))([-a-zA-Z0-9_]{11,})/
const youtubePlaylistRegex = /^.*(youtu.be\/|list=)([^#\&\?]*).*/

console.log(youtubeRegex.exec("https://www.youtube.com/watch?v=H4PZ7mju5QQ"))