"""Check the resource-table layout Android requires for APK installation."""
import struct
import zipfile


def verify_resources(apk):
    with zipfile.ZipFile(apk) as archive, open(apk, 'rb') as stream:
        entry = archive.getinfo('resources.arsc')
        if entry.compress_type != zipfile.ZIP_STORED:
            raise ValueError(f'{apk}: resources.arsc must be uncompressed (Android -124)')
        stream.seek(entry.header_offset)
        header = stream.read(30)
        if header[:4] != b'PK\x03\x04':
            raise ValueError(f'{apk}: invalid resource local header')
        name_length, extra_length = struct.unpack_from('<HH', header, 26)
        offset = entry.header_offset + 30 + name_length + extra_length
        if offset % 4:
            raise ValueError(f'{apk}: resources.arsc must be 4-byte aligned (Android -124)')
        if archive.testzip() is not None:
            raise ValueError(f'{apk}: APK ZIP checksum mismatch')
    print(f'PASS resource table: uncompressed, 4-byte aligned at {offset}')
