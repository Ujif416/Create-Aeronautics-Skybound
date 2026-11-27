"""Publish verified, deduplicated objects first and the public catalog last."""
import hashlib
import json
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import boto3
from botocore.config import Config

BUCKET = '16ea7843-721c-40d2-8233-7e888b857134'


def publish():
    if not all(os.environ.get(name) for name in ('AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY')):
        raise SystemExit('Configure TWC_ACCESS_KEY_ID and TWC_SECRET_ACCESS_KEY in GitHub Actions.')
    s3 = boto3.client('s3', endpoint_url='https://s3.twcstorage.ru', region_name='ru-1',
                      config=Config(s3={'addressing_style': 'path'}, request_checksum_calculation='when_required'))
    if sys.argv[1:] == ['installers']:
        for asset in Path('release').iterdir():
            s3.upload_file(str(asset), BUCKET, 'launcher/releases/1.0.15/' + asset.name)
        return
    if sys.argv[1:] != ['pack']:
        raise SystemExit('Choose pack or installers')
    catalog = Path('launcher/servers.json').read_bytes()
    existing = {}
    pages = s3.get_paginator('list_objects_v2').paginate(Bucket=BUCKET, Prefix='objects/')
    for page in pages:
        existing.update({obj['Key']: obj['Size'] for obj in page.get('Contents', [])})

    def upload(item):
        commit, entry = item
        key = 'objects/' + entry['sha256']
        if existing.get(key) == entry['size']:
            return
        data = subprocess.check_output(['git', 'cat-file', 'blob', commit + ':pack/' + entry['path']])
        if len(data) != entry['size'] or hashlib.sha256(data).hexdigest() != entry['sha256']:
            raise ValueError('Invalid pack file: ' + entry['path'])
        s3.put_object(Bucket=BUCKET, Key=key, Body=data)

    objects = {}
    indexes = {}
    for server in json.loads(catalog)['servers']:
        pack = server['pack']
        commit = pack['commit']
        if not re.fullmatch(r'[0-9a-f]{40}', commit):
            raise ValueError('Invalid pack commit')
        if subprocess.run(['git', 'cat-file', '-e', commit + '^{commit}'], stderr=subprocess.DEVNULL).returncode:
            subprocess.run(['git', 'fetch', '--no-tags', '--depth=1', 'origin', commit], check=True)
        index = subprocess.check_output(['git', 'cat-file', 'blob', commit + ':pack-index.json'])
        if hashlib.sha256(index).hexdigest() != pack['indexSha256']:
            raise ValueError('Invalid index for ' + server['id'])
        indexes[commit] = index
        for entry in json.loads(index)['files']:
            objects[entry['sha256']] = (commit, entry)

    with ThreadPoolExecutor(max_workers=8) as pool:
        for _ in pool.map(upload, objects.values()):
            pass
    for commit, index in indexes.items():
        s3.put_object(Bucket=BUCKET, Key=commit + '/pack-index.json', Body=index,
                      ContentType='application/json')
    s3.put_object(Bucket=BUCKET, Key='launcher/servers.json', Body=catalog,
                  ContentType='application/json', CacheControl='no-cache')
    print('Published', len(indexes), 'indexes and', len(objects), 'unique files')


if __name__ == '__main__':
    publish()
