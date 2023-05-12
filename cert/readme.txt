to generate a new cert with a different ip address, change the desired address in two places in the request.txt file then run:

openssl req -new -nodes -x509 -days 365 -keyout domain.key -out domain.crt -config ./request.txt