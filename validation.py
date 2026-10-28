import math
import re

def sanitize(data, identity):
    if not isinstance(data, dict) or data.get('type') != 'move':
        return None
    for key in ('x','z'):
        n = data.get(key)
        if isinstance(n, bool) or not isinstance(n, (int,float)) or not math.isfinite(n) or abs(n)>35:
            return None
    packet = {'type':'move', 'id':identity, 'x':data['x'], 'z':data['z']}
    rot = data.get('rot',0)
    packet['rot'] = rot if isinstance(rot,(int,float)) and not isinstance(rot,bool) and math.isfinite(rot) else 0
    for key in ('skin','shirt','hair'):
        value = data.get(key,'')
        packet[key] = value if isinstance(value,str) and re.fullmatch(r'#[0-9a-fA-F]{6}',value) else '#c88e62'
    packet['style'] = data.get('style') if data.get('style') in ('short','long','bun') else 'short'
    packet['equipped'] = data.get('equipped') if data.get('equipped') in ('매듭 장식 의상','직조 장식','도자기 소품') else ''
    return packet

