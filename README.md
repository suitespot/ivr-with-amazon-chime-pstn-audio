## Fix SearchAvailablePhoneNumbers Error
After `pnpm i`, add following lines to `node_modules/cdk-amazon-chime-resources/resources/pstn/phonenumbers.py`:
```python
    phoneNumberType=None,
```
to line 33

```python
    if phoneNumberType:
            params["PhoneNumberType"] = phoneNumberType
        
``` 
to line 40
