# google-sheets-parser

Imports data from public Google Sheets and parses it to Jekyll markdown with yaml front matter.

## Usage

 1. Clone this repository and `cd` into the directory.
 2. `npm install`.
 3. Prepare your Google Spreadsheet:
  1. Make it public.
  2. Go to **File > Publish to the web** and publish it.
 4. Create a file named `sheet_id.txt` in the directory. Put the sheet's id in this file. For example, if your sheet's URL is:

        https://docs.google.com/spreadsheets/d/MSjDkqe7OzWgd390OaWDzzFTi/

    put

        MSjDkqe7OzWgd390OaWDzzFTi

    in the file.
 5. `node ./index.js`
 6. Copy the contents of `responses/` to your Jekyll site.
