.PHOHY: upload
upload:
	rsync -az --progress -e ssh --delete dist/ gnuradio.org:/srv/www/gnuradio.org/
