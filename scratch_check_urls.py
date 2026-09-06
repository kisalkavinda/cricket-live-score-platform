import urllib.parse
for path in ['apps/web/.env.local', '.env']:
    try:
        with open(path) as f:
            for line in f:
                if line.startswith('DATABASE_URL=') or line.startswith('DIRECT_URL='):
                    k, v = line.strip().split('=', 1)
                    val = v.strip('\'\"')
                    u = urllib.parse.urlparse(val)
                    print(path, k, 'host:', u.hostname, 'port:', u.port, 'query:', u.query)
    except Exception as e:
        print(path, e)
